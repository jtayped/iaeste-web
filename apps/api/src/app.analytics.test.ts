import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createApp } from "./app";
import { OdooError, OdooNotConfiguredError } from "./lib/odoo";
import {
  createCrmAnalyticsStub,
  createRegistrationServiceStub,
  createStubAuth,
  emptyCrmAnalytics,
  quietLogger,
} from "./test-support/app";
import type { CrmAnalyticsService } from "./services/crm-analytics-service";

/**
 * HTTP contract for the CRM analytics endpoint. No database: the handler only
 * talks to the injected service. Authorization depth is covered once in
 * `routes/admin-auth.test.ts`; what matters here is the capability wiring and
 * how an upstream Odoo failure surfaces.
 */

const PATH = "/v1/admin/analytics/crm";

function app(
  opts: {
    role?: "member" | "admin";
    signedOut?: boolean;
    crmAnalytics?: CrmAnalyticsService;
  } = {},
) {
  return createApp({
    auth: createStubAuth(
      opts.signedOut ? null : { role: opts.role ?? "admin" },
    ),
    crmAnalytics: opts.crmAnalytics ?? createCrmAnalyticsStub(),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createRegistrationServiceStub(),
  });
}

describe("GET /v1/admin/analytics/crm", () => {
  it("returns the snapshot to an admin", async () => {
    const response = await app().request(PATH);
    const body = (await response.json()) as typeof emptyCrmAnalytics;

    assert.equal(response.status, 200);
    assert.equal(body.stale, false);
    assert.equal(body.totals.allLeads, 0);
    assert.ok(Array.isArray(body.owners));
  });

  it("passes the service's numbers through untouched", async () => {
    const response = await app({
      crmAnalytics: createCrmAnalyticsStub({
        snapshot: async () => ({
          ...emptyCrmAnalytics,
          totals: {
            ...emptyCrmAnalytics.totals,
            allLeads: 1149,
            openLeads: 253,
            unassignedLeads: 144,
          },
        }),
      }),
    }).request(PATH);
    const body = (await response.json()) as typeof emptyCrmAnalytics;

    assert.equal(body.totals.allLeads, 1149);
    assert.equal(body.totals.unassignedLeads, 144);
  });

  it("serves a stale snapshot with the flag set rather than failing", async () => {
    const response = await app({
      crmAnalytics: createCrmAnalyticsStub({
        snapshot: async () => ({ ...emptyCrmAnalytics, stale: true }),
      }),
    }).request(PATH);
    const body = (await response.json()) as typeof emptyCrmAnalytics;

    assert.equal(response.status, 200);
    assert.equal(body.stale, true);
  });

  it("requires a session", async () => {
    const response = await app({ signedOut: true }).request(PATH);
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 401);
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  // A member holds `dashboard.read` (the overview counts) and still must not
  // reach this route: the CRM is about the companies we negotiate with.
  it("requires the analytics.read capability", async () => {
    const response = await app({ role: "member" }).request(PATH);
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("reports an unconfigured Odoo as unavailable, not as a server error", async () => {
    const response = await app({
      crmAnalytics: createCrmAnalyticsStub({
        snapshot: async () => {
          throw new OdooNotConfiguredError();
        },
      }),
    }).request(PATH);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };

    assert.equal(response.status, 503);
    assert.equal(body.error.code, "UPSTREAM_UNAVAILABLE");
    assert.match(body.error.message, /not configured/);
  });

  it("reports an unreachable Odoo as unavailable", async () => {
    const response = await app({
      crmAnalytics: createCrmAnalyticsStub({
        snapshot: async () => {
          throw new OdooError("Invalid apikey", 401, "werkzeug.Unauthorized");
        },
      }),
    }).request(PATH);
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 503);
    assert.equal(body.error.code, "UPSTREAM_UNAVAILABLE");
  });

  it("never leaks Odoo's internals into the response body", async () => {
    // Odoo's error payloads carry a Python traceback and its own exception
    // names; neither belongs in something we hand to a browser.
    const response = await app({
      crmAnalytics: createCrmAnalyticsStub({
        snapshot: async () => {
          throw new OdooError(
            "Traceback (most recent call last): /home/odoo/src/odoo/http.py",
            403,
            "odoo.exceptions.AccessError",
          );
        },
      }),
    }).request(PATH);
    const text = await response.text();

    assert.equal(response.status, 503);
    assert.doesNotMatch(text, /Traceback/);
    assert.doesNotMatch(text, /home\/odoo/);
    assert.doesNotMatch(text, /AccessError/);
  });

  it("still surfaces an unexpected failure as a 500", async () => {
    const response = await app({
      crmAnalytics: createCrmAnalyticsStub({
        snapshot: async () => {
          throw new TypeError("a genuine bug");
        },
      }),
    }).request(PATH);
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 500);
    assert.equal(body.error.code, "INTERNAL_ERROR");
  });
});

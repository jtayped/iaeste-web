import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import { createCampaignRepository } from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";

import { createApp } from "../app";
import {
  createRegistrationServiceStub,
  createStubAuth,
  quietLogger,
} from "../test-support/app";

/**
 * HTTP contract for the campaign admin routes (IA-52), against the real
 * test database. Authorization depth (signed out / member / revoked) is
 * covered once in `admin-auth.test.ts`; here we check the capability is
 * wired and the handlers behave.
 */

function app(db: Database, role: "member" | "admin" = "admin") {
  return createApp({
    db,
    auth: createStubAuth({ role }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createRegistrationServiceStub(),
  });
}

const isoDates = {
  membershipStartsAt: "2026-09-01T00:00:00.000Z",
  membershipEndsAt: "2027-06-30T00:00:00.000Z",
  registrationOpensAt: "2026-08-01T00:00:00.000Z",
  registrationClosesAt: "2026-09-30T00:00:00.000Z",
};

function post(a: ReturnType<typeof app>, path: string, body?: unknown) {
  return a.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

describe("admin campaigns routes", () => {
  let db: Database;

  before(async () => {
    db = await getTestDb();
  });
  afterEach(async () => {
    await truncateAll(db);
  });
  after(async () => {
    await closeTestDb();
  });

  it("403s a member on every campaign route", async () => {
    const a = app(db, "member");
    assert.equal((await a.request("/v1/admin/campaigns")).status, 403);
    assert.equal((await post(a, "/v1/admin/campaigns", {})).status, 403);
    assert.equal((await post(a, "/v1/admin/campaigns/x/current")).status, 403);
  });

  it("creates a draft, lists it with zero counts, then edits its label", async () => {
    const a = app(db);
    const created = await post(a, "/v1/admin/campaigns", {
      slug: "2026-2027",
      label: "Curs 2026–2027",
      ...isoDates,
    });
    assert.equal(created.status, 201);
    const draft = (await created.json()) as { id: string; state: string };
    assert.equal(draft.state, "draft");

    const list = await a.request("/v1/admin/campaigns");
    assert.equal(list.status, 200);
    const page = (await list.json()) as {
      rows: Array<{ id: string; activeMembers: number; pendingReview: number }>;
      total: number;
    };
    assert.equal(page.total, 1);
    assert.equal(page.rows.length, 1);
    assert.equal(page.rows[0]?.activeMembers, 0);
    assert.equal(page.rows[0]?.pendingReview, 0);

    const patched = await a.request(`/v1/admin/campaigns/${draft.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "Curs 2026-2027 (revisat)" }),
    });
    assert.equal(patched.status, 200);
    assert.equal(
      ((await patched.json()) as { label: string }).label,
      "Curs 2026-2027 (revisat)",
    );
  });

  it("422s an invalid create body", async () => {
    const res = await post(app(db), "/v1/admin/campaigns", {
      slug: "Bad Slug!",
      label: "x",
      ...isoDates,
    });
    assert.equal(res.status, 422);
  });

  it("409s a duplicate slug", async () => {
    const a = app(db);
    const body = { slug: "dup", label: "One", ...isoDates };
    assert.equal((await post(a, "/v1/admin/campaigns", body)).status, 201);
    const second = await post(a, "/v1/admin/campaigns", {
      ...body,
      label: "Two",
    });
    assert.equal(second.status, 409);
  });

  it("promotes a draft to published and switches the current flag", async () => {
    const a = app(db);
    const repo = createCampaignRepository(db);
    const first = await repo.create({
      slug: "c1",
      label: "C1",
      membershipStartsAt: new Date(isoDates.membershipStartsAt),
      membershipEndsAt: new Date(isoDates.membershipEndsAt),
      registrationOpensAt: new Date(isoDates.registrationOpensAt),
      registrationClosesAt: new Date(isoDates.registrationClosesAt),
    });
    await repo.setCurrent(first.id);

    const created = await post(a, "/v1/admin/campaigns", {
      slug: "c2",
      label: "C2",
      ...isoDates,
    });
    const second = (await created.json()) as { id: string };

    const res = await post(a, `/v1/admin/campaigns/${second.id}/current`);
    assert.equal(res.status, 200);
    const view = (await res.json()) as {
      isCurrent: boolean;
      state: string;
    };
    assert.equal(view.isCurrent, true);
    assert.equal(view.state, "published");

    assert.equal((await repo.getById(first.id))?.isCurrent, false);
  });

  it("opens registration for one campaign and closes the previously-open one", async () => {
    const a = app(db);
    const repo = createCampaignRepository(db);
    const mk = (slug: string) =>
      repo.create({
        slug,
        label: slug,
        membershipStartsAt: new Date(isoDates.membershipStartsAt),
        membershipEndsAt: new Date(isoDates.membershipEndsAt),
        registrationOpensAt: new Date(isoDates.registrationOpensAt),
        registrationClosesAt: new Date(isoDates.registrationClosesAt),
      });
    const a1 = await mk("open-1");
    const a2 = await mk("open-2");
    await repo.setRegistrationOpen(a1.id);

    const res = await post(a, `/v1/admin/campaigns/${a2.id}/registration`, {
      open: true,
    });
    assert.equal(res.status, 200);
    assert.equal(
      ((await res.json()) as { isRegistrationOpen: boolean })
        .isRegistrationOpen,
      true,
    );
    assert.equal((await repo.getById(a1.id))?.isRegistrationOpen, false);

    const closed = await post(a, `/v1/admin/campaigns/${a2.id}/registration`, {
      open: false,
    });
    assert.equal(closed.status, 200);
    assert.equal(
      ((await closed.json()) as { isRegistrationOpen: boolean })
        .isRegistrationOpen,
      false,
    );
  });

  it("archives a campaign without deleting it", async () => {
    const a = app(db);
    const created = await post(a, "/v1/admin/campaigns", {
      slug: "to-archive",
      label: "Arxiu",
      ...isoDates,
    });
    const { id } = (await created.json()) as { id: string };
    await post(a, `/v1/admin/campaigns/${id}/current`);

    const res = await post(a, `/v1/admin/campaigns/${id}/archive`);
    assert.equal(res.status, 200);
    const view = (await res.json()) as {
      state: string;
      isCurrent: boolean;
    };
    assert.equal(view.state, "archived");
    assert.equal(view.isCurrent, false);
    assert.ok(await createCampaignRepository(db).getById(id));
  });

  it("404s an unknown campaign id", async () => {
    const res = await post(app(db), "/v1/admin/campaigns/nope/archive");
    assert.equal(res.status, 404);
  });
});

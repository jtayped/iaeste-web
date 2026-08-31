import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import type { Emailer } from "@repo/email/resend";

import { createAuth, isAdminRole, isAuthRole } from "./index";
import type { CreateAuthConfig } from "./config";

/**
 * Package-level tests for the config itself — no real Postgres involved.
 * Better Auth's `drizzleAdapter` doesn't touch the database at construction
 * time (only when an endpoint actually runs a query, confirmed empirically
 * while building this package), so a bare object stands in for a real
 * `Database` here. The magic-link/session/admin *behaviour* that does need
 * a real database (disableSignUp, session revocation, etc.) is covered by
 * `apps/api`'s integration tests instead — see
 * `apps/api/src/routes/auth.test.ts`.
 */

function fakeEmailer(): Emailer {
  return {
    async send() {
      // Never called in these tests.
    },
  };
}

const baseConfig: CreateAuthConfig = {
  db: {} as unknown as Database,
  emailer: fakeEmailer(),
  baseURL: "http://localhost:3005",
  secret: "test-secret-not-used-for-anything-real",
  trustedOrigins: ["http://localhost:3005"],
  runtime: "test",
};

describe("createAuth", () => {
  it("constructs without touching the database or throwing", () => {
    const auth = createAuth(baseConfig);
    assert.equal(typeof auth.handler, "function");
  });

  it("refuses insecure cookies in production", () => {
    assert.throws(
      () =>
        createAuth({
          ...baseConfig,
          runtime: "production",
          insecureCookies: true,
        }),
      /insecureCookies cannot be true in production/,
    );
  });

  it("allows insecure cookies outside production", () => {
    assert.doesNotThrow(() =>
      createAuth({
        ...baseConfig,
        runtime: "development",
        insecureCookies: true,
      }),
    );
  });

  it("never throws for the production-safe default (insecureCookies unset)", () => {
    assert.doesNotThrow(() =>
      createAuth({ ...baseConfig, runtime: "production" }),
    );
  });

  it("disables self-service sign-up on the magic-link plugin", () => {
    const auth = createAuth(baseConfig);
    const magicLinkPlugin = auth.options.plugins?.find(
      (plugin) => plugin.id === "magic-link",
    );
    assert.equal(
      (magicLinkPlugin?.options as { disableSignUp?: boolean } | undefined)
        ?.disableSignUp,
      true,
    );
    assert.equal(
      (magicLinkPlugin?.options as { storeToken?: string } | undefined)
        ?.storeToken,
      "hashed",
    );
  });

  it("recognises only the two supported roles", () => {
    assert.equal(isAuthRole("member"), true);
    assert.equal(isAuthRole("admin"), true);
    assert.equal(isAuthRole("owner"), false);
    assert.equal(isAdminRole("admin"), true);
    assert.equal(isAdminRole("member"), false);
  });

  it("configures the admin plugin with member and admin roles", () => {
    const auth = createAuth(baseConfig);
    const adminPlugin = auth.options.plugins?.find(
      (plugin) => plugin.id === "admin",
    );
    const options = adminPlugin?.options as
      { defaultRole?: string; adminRoles?: string[] } | undefined;

    assert.equal(options?.defaultRole, "member");
    assert.deepEqual(options?.adminRoles, ["admin"]);
  });

  it("disables admin routes that bypass the IAESTE domain", async () => {
    const auth = createAuth(baseConfig);
    const disabledPaths = [
      "/admin/impersonate-user",
      "/admin/stop-impersonating",
      "/admin/create-user",
      "/admin/update-user",
      "/admin/remove-user",
      "/admin/set-user-password",
    ];

    for (const path of disabledPaths) {
      const response = await auth.handler(
        new Request(`http://localhost:3005/api/auth${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: "someone" }),
        }),
      );
      assert.equal(response.status, 404, path);
    }
  });
});

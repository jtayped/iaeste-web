import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import type { Emailer } from "@repo/email/resend";

import { createAuth } from "./index";
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
  baseURL: "http://localhost:3004",
  secret: "test-secret-not-used-for-anything-real",
  trustedOrigins: ["http://localhost:3005"],
};

function withNodeEnv<T>(value: string | undefined, fn: () => T): T {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    return fn();
  } finally {
    process.env.NODE_ENV = original;
  }
}

describe("createAuth", () => {
  it("constructs without touching the database or throwing", () => {
    const auth = createAuth(baseConfig);
    assert.equal(typeof auth.handler, "function");
  });

  it("refuses insecure cookies when NODE_ENV is production, regardless of the caller", () => {
    withNodeEnv("production", () => {
      assert.throws(
        () => createAuth({ ...baseConfig, insecureCookies: true }),
        /insecureCookies must never be true/,
      );
    });
  });

  it("allows insecure cookies outside production", () => {
    withNodeEnv("development", () => {
      assert.doesNotThrow(() =>
        createAuth({ ...baseConfig, insecureCookies: true }),
      );
    });
  });

  it("never throws for the production-safe default (insecureCookies unset)", () => {
    withNodeEnv("production", () => {
      assert.doesNotThrow(() => createAuth(baseConfig));
    });
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
  });

  it("disables admin impersonation at the router level", async () => {
    const auth = createAuth(baseConfig);
    const response = await auth.handler(
      new Request("http://localhost:3004/api/auth/admin/impersonate-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "someone" }),
      }),
    );

    assert.equal(response.status, 404);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getAuthBaseUrl,
  getAuthSecret,
  getAuthTrustedOrigins,
  getRuntimeEnvironment,
} from "./config";

describe("auth configuration", () => {
  it("normalises the explicit trusted-origin allowlist", () => {
    assert.deepEqual(
      getAuthTrustedOrigins(
        "https://admin.iaestelleida.cat/, http://localhost:3005 ",
      ),
      ["https://admin.iaestelleida.cat", "http://localhost:3005"],
    );
    assert.throws(
      () => getAuthTrustedOrigins("https://*.iaestelleida.cat"),
      /cannot contain wildcards/,
    );
    assert.throws(
      () => getAuthTrustedOrigins("https://admin.iaestelleida.cat/auth"),
      /entries must be http\(s\) origins/,
    );
  });

  it("accepts only an HTTP origin as the stable auth base URL", () => {
    assert.equal(
      getAuthBaseUrl("https://admin.iaestelleida.cat/"),
      "https://admin.iaestelleida.cat",
    );
    assert.throws(
      () => getAuthBaseUrl("https://admin.iaestelleida.cat/auth"),
      /must be an http\(s\) origin without a path/,
    );
    assert.throws(
      () => getAuthBaseUrl("file:///tmp/auth"),
      /must be an http\(s\) origin without a path/,
    );
  });

  it("requires explicit production origins", () => {
    // Hermetic: these two are set in the repo's local `.env` (which the test
    // runner loads via `dotenv -e`), so the ambient values are cleared for
    // the duration of this check rather than assumed absent.
    const saved = {
      ADMIN_PUBLIC_ORIGIN: process.env.ADMIN_PUBLIC_ORIGIN,
      BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    };
    delete process.env.ADMIN_PUBLIC_ORIGIN;
    delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
    try {
      assert.throws(
        () => getAuthBaseUrl(undefined, "production"),
        /Missing required environment variable: ADMIN_PUBLIC_ORIGIN/,
      );
      assert.throws(
        () => getAuthTrustedOrigins(undefined, "production"),
        /Missing required environment variable: BETTER_AUTH_TRUSTED_ORIGINS/,
      );
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("rejects unknown runtime names", () => {
    assert.equal(getRuntimeEnvironment("production"), "production");
    assert.throws(
      () => getRuntimeEnvironment("prod"),
      /must be development, test, or production/,
    );
  });

  it("rejects an auth secret shorter than 32 characters", () => {
    assert.equal(getAuthSecret("x".repeat(32)), "x".repeat(32));
    assert.throws(
      () => getAuthSecret("too-short"),
      /must be at least 32 characters long/,
    );
  });
});

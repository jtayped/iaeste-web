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
    assert.throws(
      () => getAuthBaseUrl(undefined, "production"),
      /Missing required environment variable: ADMIN_PUBLIC_ORIGIN/,
    );
    assert.throws(
      () => getAuthTrustedOrigins(undefined, "production"),
      /Missing required environment variable: BETTER_AUTH_TRUSTED_ORIGINS/,
    );
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

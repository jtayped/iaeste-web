import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getAuthBaseUrl,
  getAuthSecret,
  getAuthTrustedOrigins,
  getOdooConfig,
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

describe("Odoo configuration", () => {
  // Every case passes all three arguments explicitly. Leaving one
  // `undefined` falls through to the default parameter and reads the real
  // `.env`, so the test would pass or fail depending on whether the machine
  // running it happens to have Odoo configured.
  it("returns null when nothing is set, so the API boots without Odoo", () => {
    assert.equal(getOdooConfig("", "", ""), null);
    assert.equal(getOdooConfig("", "  ", ""), null);
  });

  it("throws naming the missing keys when only part of the group is set", () => {
    // Partially configured is a mistake, not a "disabled" state — failing
    // quietly here would surface as a confusing 503 much later.
    assert.throws(
      () => getOdooConfig("https://iaestelleida.odoo.com", "", ""),
      /partially configured; also set: database, apiKey/,
    );
    assert.throws(
      () => getOdooConfig("", "", "key"),
      /partially configured; also set: baseUrl, database/,
    );
  });

  it("requires https, because the api key travels in a header", () => {
    assert.throws(
      () => getOdooConfig("http://iaestelleida.odoo.com", "db", "key"),
      /must be an https: URL/,
    );
  });

  it("trims the values and strips a trailing slash from the base URL", () => {
    assert.deepEqual(
      getOdooConfig("https://iaestelleida.odoo.com/", " iaestelleida ", " k "),
      {
        apiKey: "k",
        baseUrl: "https://iaestelleida.odoo.com",
        database: "iaestelleida",
      },
    );
  });
});

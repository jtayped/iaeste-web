import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPool } from "./client";
import { verifyConnection } from "./test-connection";

describe("verifyConnection", () => {
  it("throws a clear error, without the connection string or credentials, when the database is unreachable", async () => {
    const secretPassword = "s3cr3t-password-do-not-leak";
    const badUrl = `postgres://joel:${secretPassword}@localhost:1/nonexistent_db`;
    const pool = createPool(badUrl);

    try {
      await assert.rejects(
        () => verifyConnection(pool, badUrl),
        (error: Error) => {
          assert.match(error.message, /Could not connect to the database/);
          // Safe to show: host/port/database name.
          assert.match(error.message, /localhost:1\/nonexistent_db/);
          // Never safe to show: username, password, or the full URL.
          assert.doesNotMatch(error.message, /joel/);
          assert.doesNotMatch(error.message, new RegExp(secretPassword));
          assert.doesNotMatch(error.message, /postgres:\/\//);
          return true;
        },
      );
    } finally {
      await pool.end();
    }
  });

  it("does not leak the connection string when it is malformed", async () => {
    const pool = createPool("postgres://localhost:1/db");
    const badUrl = "not a valid connection string";

    try {
      await assert.rejects(
        () => verifyConnection(pool, badUrl),
        (error: Error) => {
          assert.match(error.message, /Could not connect to the database/);
          assert.doesNotMatch(error.message, /not a valid connection string/);
          return true;
        },
      );
    } finally {
      await pool.end();
    }
  });
});

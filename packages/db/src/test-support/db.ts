// Test-only helpers for running the repository suite against a real
// Postgres database (`iaeste_test`), never mocks — see IA-11's acceptance
// criteria. Exposed via the package's `./test-support` export so `apps/api`
// can exercise its Drizzle-backed repositories against the same real
// database (IA-12) without duplicating this migration/truncation logic.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { assertAllowedDatabase, TEST_DATABASE_PREFIX } from "../config";
import { createDb, createPool, type Database } from "../client";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "..", "..", "drizzle");

function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Add it to your environment (see .env.example) before running the repository test suite.",
    );
  }
  // Refuses to run against anything but this project's own test database —
  // see the module comment on `assertAllowedDatabase`.
  assertAllowedDatabase(url, { prefix: TEST_DATABASE_PREFIX });
  return url;
}

let shared: { pool: ReturnType<typeof createPool>; db: Database } | undefined;

/**
 * Migrates `iaeste_test` up to the current schema (a no-op if it is already
 * there — drizzle's migrator tracks applied migrations in its own table, the
 * same mechanism `db:migrate` uses) and returns a client bound to it. Safe
 * to call from every test file's `before` hook: they all share one pool.
 */
export async function getTestDb(): Promise<Database> {
  if (!shared) {
    const url = getTestDatabaseUrl();
    const pool = createPool(url);
    const db = createDb(pool);
    shared = { pool, db };
  }

  await migrate(shared.db, { migrationsFolder });
  return shared.db;
}

/** Every table this package owns, in no particular order — `CASCADE` covers FKs. */
const TABLES = [
  "membership_event",
  "member_invitation",
  "membership",
  "registration_verification",
  "registration",
  // No foreign key of its own, so `CASCADE` from `user` never reaches it —
  // it has to be named here or challenge rows leak between tests.
  "email_challenge",
  "membership_campaign",
  "member_profile",
  "verification",
  "account",
  "session",
  "user",
];

/**
 * Clears every table between tests so one test's rows never leak into the
 * next. Runs as a single statement, so it is atomic and there is no
 * "half-truncated" state a failure could leave behind.
 *
 * This is also why the root `test` script runs with `--test-concurrency=1`:
 * `node --test` runs separate test *files* in parallel by default, and every
 * file here shares this one `iaeste_test` database. Without serialising
 * files, one file's `truncateAll` can wipe rows a different file's test is
 * mid-transaction on.
 */
export async function truncateAll(db: Database): Promise<void> {
  const tableList = TABLES.map((name) => `"${name}"`).join(", ");
  await db.execute(`truncate table ${tableList} restart identity cascade`);
}

export async function closeTestDb(): Promise<void> {
  if (shared) {
    const { pool } = shared;
    shared = undefined;
    await pool.end();
  }
}

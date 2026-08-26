// Drops and recreates every table in `iaeste_dev`, then re-applies every
// migration from scratch. Guarded to that exact database — see
// `assertAllowedDatabase` — so a misconfigured DATABASE_URL can never touch
// `iaeste_test` or an unrelated database on the shared Postgres instance.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  assertAllowedDatabase,
  DEV_DATABASE_NAME,
  getDatabaseUrl,
} from "../src/config";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "..", "drizzle");

async function main() {
  const url = getDatabaseUrl();
  assertAllowedDatabase(url, { exact: DEV_DATABASE_NAME });

  const pool = new Pool({ connectionString: url });
  try {
    console.log(
      `Resetting ${DEV_DATABASE_NAME}: dropping and recreating the public schema...`,
    );
    await pool.query("drop schema public cascade");
    await pool.query("create schema public");
    // drizzle's own migration-tracking table lives in a separate "drizzle"
    // schema, untouched by the drop above. Without dropping it too, `migrate`
    // below would see every migration already marked applied and skip them
    // all, leaving `public` empty.
    await pool.query("drop schema if exists drizzle cascade");

    const db = drizzle(pool);
    console.log("Re-applying migrations...");
    await migrate(db, { migrationsFolder });

    console.log("Done.");
  } finally {
    await pool.end();
  }
}

await main();

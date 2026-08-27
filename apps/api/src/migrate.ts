import path from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { PoolClient } from "pg";

import { createPool } from "@repo/db/client";

const migrationLockName = "iaeste-schema-migrations";
const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packages/db/drizzle",
);

async function runMigrations(): Promise<void> {
  const pool = createPool();
  let client: PoolClient | undefined;
  let lockHeld = false;

  try {
    client = await pool.connect();
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      migrationLockName,
    ]);
    lockHeld = true;

    await migrate(drizzle(client), { migrationsFolder });
    console.log("Database migrations are current");
  } finally {
    try {
      if (client && lockHeld) {
        await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
          migrationLockName,
        ]);
      }
    } finally {
      client?.release();
      await pool.end();
    }
  }
}

try {
  await runMigrations();
} catch {
  console.error(
    "Database migration failed. Check DATABASE_URL and PostgreSQL availability.",
  );
  process.exitCode = 1;
}

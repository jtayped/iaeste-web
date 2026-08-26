import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { getDatabaseUrl } from "./config";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * The type of `tx` inside `db.transaction(async (tx) => ...)`. Derived from
 * `Database["transaction"]` itself (rather than reconstructed by hand from
 * drizzle's internals) so it can never drift out of sync with the real
 * signature. Repositories accept `Db = Database | Transaction` so the same
 * repository function works whether it is given the top-level client or a
 * transaction — which is how every multi-table transition in this package
 * composes repositories atomically (see `registrations.ts`'s `accept`).
 */
export type Transaction = Parameters<Database["transaction"]>[0] extends (
  tx: infer T,
  ...args: never[]
) => unknown
  ? T
  : never;

/** What a repository factory accepts: the client, or a transaction. */
export type Db = Database | Transaction;

/**
 * Bounded connection pool. This targets a single Coolify-managed PostgreSQL
 * instance sitting behind a single `apps/api` container (no horizontal
 * scaling in this plan — see IA-08/IA-62) — there is exactly one writer, so
 * a large pool buys nothing and only risks exhausting Postgres's own
 * `max_connections` once `drizzle-kit studio`, a one-off script, and a
 * human's `psql` session are added to the mix. `idleTimeoutMillis` returns
 * unused sockets to Postgres instead of pinning them for the container's
 * whole lifetime; `connectionTimeoutMillis` turns a stuck connection attempt
 * into a fast, visible failure instead of a hung request.
 */
const POOL_MAX = 10;
const IDLE_TIMEOUT_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 5_000;

export function createPool(connectionString: string = getDatabaseUrl()): Pool {
  const pool = new Pool({
    connectionString,
    max: POOL_MAX,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });

  // node-postgres requires a listener on the pool's "error" event: without
  // one, an error on a client sitting idle in the pool (e.g. the network
  // drops) becomes an unhandled 'error' event and crashes the whole
  // process, not just the one query that would otherwise fail.
  pool.on("error", (error) => {
    console.error("Unexpected error on an idle Postgres client:", error);
  });

  return pool;
}

export function createDb(pool: Pool): Database {
  return drizzle(pool, { schema });
}

let singleton: { pool: Pool; db: Database } | undefined;

/**
 * Lazily-created singleton pool + client for application code. Deliberately
 * not created at module load, so importing `@repo/db/schema` or
 * `@repo/db/repositories` for their types never opens a socket — only
 * calling `getDb()` does.
 */
export function getDb(): Database {
  singleton ??= createPoolAndDb();
  return singleton.db;
}

export function getPool(): Pool {
  singleton ??= createPoolAndDb();
  return singleton.pool;
}

function createPoolAndDb(): { pool: Pool; db: Database } {
  const pool = createPool();
  return { pool, db: createDb(pool) };
}

/** For tests and graceful shutdown: closes the singleton pool, if one exists. */
export async function closeDb(): Promise<void> {
  if (singleton) {
    const { pool } = singleton;
    singleton = undefined;
    await pool.end();
  }
}

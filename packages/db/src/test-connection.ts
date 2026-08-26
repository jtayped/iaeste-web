import type { Pool } from "pg";

import { getDatabaseName } from "./config";

/**
 * Verifies the pool can actually reach and authenticate against Postgres,
 * for a clear startup failure instead of the first API request failing with
 * whatever `pg` error happened to surface deepest in a request handler.
 *
 * The thrown error never includes the connection string or any credential
 * from it (host and port are not credentials and are safe to show an
 * operator debugging a deployment) — see IA-10's acceptance criteria.
 */
export async function verifyConnection(
  pool: Pool,
  connectionString: string,
): Promise<void> {
  let client;
  try {
    client = await pool.connect();
  } catch (cause) {
    throw connectionFailure(connectionString, cause);
  }

  try {
    await client.query("select 1");
  } catch (cause) {
    throw connectionFailure(connectionString, cause);
  } finally {
    client.release();
  }
}

function connectionFailure(connectionString: string, cause: unknown): Error {
  const target = describeTarget(connectionString);
  return new Error(
    `Could not connect to the database${target ? ` at ${target}` : ""}. ` +
      "Check that PostgreSQL is running, reachable, and that DATABASE_URL is correct.",
    { cause },
  );
}

/** `host:port/database` — never the username or password. */
function describeTarget(connectionString: string): string | undefined {
  try {
    const url = new URL(connectionString);
    const port = url.port || "5432";
    return `${url.hostname}:${port}/${getDatabaseName(connectionString)}`;
  } catch {
    // Malformed connection string: say nothing rather than risk echoing it.
    return undefined;
  }
}

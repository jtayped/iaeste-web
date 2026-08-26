/**
 * `@repo/db` is exempt from the repo-wide "no bare `process.env`" boundary
 * rule (see `tooling/eslint/base.js`) the same way `apps/api` is: it is a
 * server-only package with its own config module, not front-end code that
 * should be routed through `@repo/env`.
 */

/** Database name this task is allowed to point at for destructive scripts. */
export const DEV_DATABASE_NAME = "iaeste_dev";
/** Prefix so parallel test runs (`iaeste_test`, `iaeste_test_worker3`, …) all qualify. */
export const TEST_DATABASE_PREFIX = "iaeste_test";

/**
 * Reads and minimally validates `DATABASE_URL`. Throws — rather than
 * returning `undefined` and letting `pg` fail later with a confusing error
 * deep inside a query — so a missing or malformed connection string is a
 * clear, immediate startup failure. Never include `value` (or any of its
 * parsed pieces) in the thrown message: it carries the database password.
 */
export function getDatabaseUrl(value = process.env.DATABASE_URL): string {
  if (!value) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment (see .env.example).",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid connection string. Expected postgres://user:password@host:port/database.",
    );
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(
      "DATABASE_URL must use the postgres:// (or postgresql://) scheme.",
    );
  }

  return value;
}

/** The `database` segment of a connection string, without other credentials. */
export function getDatabaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

/**
 * Guards a script that runs destructive statements (`db:reset`, `db:seed`)
 * against ever pointing at anything other than the two databases this task
 * owns on the shared instance, or — for test setup — anything other than a
 * database that at least carries the `iaeste_test` prefix, so a
 * misconfigured `DATABASE_URL`/`TEST_DATABASE_URL` fails loudly instead of
 * quietly touching an unrelated project's data.
 */
export function assertAllowedDatabase(
  url: string,
  allowed: { exact?: string; prefix?: string },
): void {
  const name = getDatabaseName(url);

  const matchesExact = allowed.exact !== undefined && name === allowed.exact;
  const matchesPrefix =
    allowed.prefix !== undefined && name.startsWith(allowed.prefix);

  if (!matchesExact && !matchesPrefix) {
    const wanted = [allowed.exact, allowed.prefix && `${allowed.prefix}*`]
      .filter(Boolean)
      .join(" or ");
    throw new Error(
      `Refusing to run: target database is "${name}", expected ${wanted}. ` +
        "This script only runs against this project's own databases.",
    );
  }
}

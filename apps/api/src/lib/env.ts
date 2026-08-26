/**
 * `apps/api` reads configuration straight from `process.env` (it is exempt
 * from the `@repo/env`-only boundary rule — see `tooling/eslint/base.js`'s
 * `boundaryRules` comment) — this is the one shared helper for "this
 * variable is required, fail loudly and clearly if it's missing" reads.
 * Kept in one place so `packages/env/scripts/check-example.mjs` (which
 * greps this package's source for calls to this function, and for direct
 * `process.env` member reads, to check `.env.example` for drift) only has
 * to know about one call shape.
 */
export function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

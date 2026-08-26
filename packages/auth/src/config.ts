import type { Database } from "@repo/db/client";
import type { Emailer } from "@repo/email/resend";

/**
 * Everything `createAuth` needs, injected rather than read from
 * `process.env` — mirrors `@repo/email`'s `createResendEmailer(config)` and
 * `apps/api`'s repository factories: this package stays pure/testable, and
 * `apps/api` (the only real caller) owns resolving env vars via its own
 * `requireEnvironmentVariable` helper. See `apps/api/src/lib/auth.ts`.
 */
export interface CreateAuthConfig {
  /**
   * A real `@repo/db` client (from `getDb()`), or a test database. Passed
   * in rather than constructed here so `createAuth` never has to call
   * `getDb()` (and therefore `getDatabaseUrl()`, which throws synchronously
   * if `DATABASE_URL` is unset) itself — the caller controls exactly when
   * that happens. See `apps/api/src/lib/auth.ts`'s `getAuth()` for why that
   * timing matters.
   */
  db: Database;
  /** Sends the magic-link sign-in email via `@repo/email`'s template. */
  emailer: Emailer;
  /**
   * Public origin at which Better Auth's own routes are mounted, i.e. this
   * API's own origin (e.g. `http://localhost:3004` in dev,
   * `https://api.iaestelleida.cat` in production) — not a frontend origin.
   */
  baseURL: string;
  /**
   * Signs and encrypts sessions, magic-link tokens, etc. Must be a long,
   * random, secret value in production — never a shared or default one.
   */
  secret: string;
  /**
   * Origins allowed to send credentialed requests to Better Auth's routes,
   * and to appear in magic-link callback/redirect URLs. Deliberately the
   * *same list* `apps/api` passes to its own CORS middleware
   * (`getAllowedOrigins()`) rather than a second, independently-maintained
   * allowlist — see `apps/api/src/app.ts`'s comment on the `/api/auth/*`
   * CORS wiring for why the two must never diverge.
   */
  trustedOrigins: string[];
  /**
   * Relaxes the session cookie's `Secure` attribute for local development,
   * where there is no HTTPS and a `Secure` cookie would simply never be
   * sent by the browser. Must be `false` (or omitted) whenever the process
   * is actually running in production — `createAuth` asserts this itself
   * at construction time (reading `NODE_ENV` directly, independent of
   * whatever the caller computed), so a misconfigured deploy fails loudly
   * at startup instead of silently shipping a cookie without `Secure`. See
   * the plan's exact wording in the IA-30 task: "Local development auth
   * that does not require production cookies, and that refuses to run
   * under NODE_ENV=production."
   */
  insecureCookies?: boolean;
}

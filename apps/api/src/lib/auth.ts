import { createAuth, type Auth } from "@repo/auth";
import { getDb } from "@repo/db/client";
import { createResendEmailer, type Emailer } from "@repo/email/resend";

import {
  getAuthSecret,
  getAuthBaseUrl,
  getAuthTrustedOrigins,
  getEmailConfig,
  getRuntimeEnvironment,
} from "../config";

let cachedEmailer: Emailer | undefined;

/**
 * Reuses `apps/api`'s single Resend account/from-address for magic-link
 * emails too (same `RESEND_API_KEY`/`REGISTRATION_EMAIL_FROM` as every
 * other email this API sends) rather than introducing a second set of
 * Resend env vars — one Resend account is enough per
 * `docs/membership-lifecycle.md`'s "every service, secret, and manual step
 * is a handover cost" argument. Lazy for the same reason
 * `repositories/registrations.ts`'s `getEmailer()` is: resolving
 * `RESEND_API_KEY` eagerly would make merely importing `app.ts` crash
 * wherever it's unset (module-import time, e.g.
 * `apps/api/scripts/generate-openapi.ts`).
 */
function getAuthEmailer(): Emailer {
  cachedEmailer ??= createResendEmailer(getEmailConfig());
  return cachedEmailer;
}

let cachedAuth: Auth | undefined;

/**
 * Lazily constructs (and memoises) the Better Auth instance mounted at
 * `/api/auth/*` in `app.ts`. Critical: `getDb()` (which throws
 * synchronously if `DATABASE_URL` is unset — see `@repo/db/client`) and
 * `getAuthSecret()` (which throws if `BETTER_AUTH_SECRET` is unset) must
 * only run when a request actually reaches `/api/auth/*`, never while
 * `createApp()` itself runs — `createApp()` runs unconditionally at
 * module-import time (`app.ts`'s `const app = createApp()`, which
 * `apps/api/scripts/generate-openapi.ts` and every test file trigger), so
 * calling this eagerly there would make merely importing `app.ts` crash in
 * any environment that hasn't configured auth yet. `app.ts` only calls
 * this from inside its `/api/auth/*` route handler, not at the top of
 * `createApp()`.
 */
export function getAuth(): Auth {
  const runtime = getRuntimeEnvironment();
  cachedAuth ??= createAuth({
    db: getDb(),
    emailer: getAuthEmailer(),
    baseURL: getAuthBaseUrl(undefined, runtime),
    secret: getAuthSecret(),
    trustedOrigins: getAuthTrustedOrigins(undefined, runtime),
    runtime,
    insecureCookies: runtime !== "production",
  });
  return cachedAuth;
}

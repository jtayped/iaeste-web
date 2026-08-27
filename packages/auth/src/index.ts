import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";

import * as schema from "@repo/db/schema";
import SignInMagicLink from "@repo/email/magic-link";

import type { CreateAuthConfig } from "./config";
import "./lib/react-global";

export type { CreateAuthConfig } from "./config";

// Magic links are short-lived on purpose: unlike the 24h email-verification
// link (IA-40), this one grants a session, so a shorter window shrinks the
// time an intercepted email is exploitable.
const MAGIC_LINK_EXPIRES_IN_SECONDS = 10 * 60;

export const authRoles = ["member", "admin"] as const;
export type AuthRole = (typeof authRoles)[number];

export function isAuthRole(value: unknown): value is AuthRole {
  return authRoles.some((role) => role === value);
}

export function isAdminRole(value: unknown): value is "admin" {
  return value === "admin";
}

/**
 * Builds the Better Auth server instance mounted at `/api/auth/*` in
 * `apps/api` (IA-30). Every config choice below is deliberate — see the
 * inline comments — rather than left at Better Auth's defaults, per the
 * plan in `docs/membership-lifecycle.md`:
 *
 * - Magic-link sign-in only (`emailAndPassword` disabled), and **no
 *   self-service sign-up**: `disableSignUp: true` means a magic-link
 *   request for an email with no existing `user` row fails cleanly instead
 *   of creating one. Accounts are provisioned elsewhere (registration
 *   acceptance IA-40, invitations IA-32) — never by merely requesting a
 *   login link. Verified in this package's own tests and in
 *   `apps/api`'s integration tests.
 * - `admin` plugin for the `member`/`admin` roles from
 *   `docs/membership-lifecycle.md` (`defaultRole: "member"`,
 *   `adminRoles: ["admin"]`). Impersonation is **disabled outright**
 *   (`disabledPaths`, below) — there is no product need for an admin to
 *   act as another member right now, and it is needless attack surface on
 *   a volunteer-run system with no dedicated security team. Every other
 *   admin-plugin endpoint (ban, set-role, and — the one this task actually
 *   needs — revoking a user's sessions) stays enabled.
 * - Generic admin create, update, delete, and password routes are disabled.
 *   Account creation belongs to registration acceptance and invitations;
 *   email changes need domain-level session revocation; v1 has no password
 *   login; hard deletion is a manual GDPR operation.
 * - No organization plugin: explicitly out of scope per the plan.
 */
export function createAuth(config: CreateAuthConfig) {
  // The API validates the runtime string before it reaches this package.
  // Keep this assertion here as the final guard against an insecure
  // production cookie.
  if (config.insecureCookies && config.runtime === "production") {
    throw new Error(
      "createAuth(): insecureCookies cannot be true in production; " +
        "the session cookie would be missing the Secure attribute.",
    );
  }

  return betterAuth({
    baseURL: config.baseURL,
    // Better Auth's own default — set explicitly so a future upstream
    // default change can't silently move where these routes live without
    // this file (and the `/api/auth/*` mount in `apps/api/src/app.ts`)
    // visibly disagreeing.
    basePath: "/api/auth",
    secret: config.secret,
    // Reuses `apps/api`'s CORS allowlist verbatim — see `CreateAuthConfig`.
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(config.db, { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    advanced: {
      // Verified against Better Auth's own cookie defaults (v1.7.1,
      // `dist/cookies/index.mjs`): `httpOnly: true` and `sameSite: "lax"`
      // are already the default, but pinned explicitly here (rather than
      // left implicit) so a future Better Auth version can't silently
      // change either without this config visibly disagreeing. `secure`
      // is the one attribute that legitimately differs between
      // environments, so it's driven by `insecureCookies` below instead of
      // being pinned to `true`.
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
      },
      // `true` only in local development (see `CreateAuthConfig.insecureCookies`
      // and the assertion above) — a `Secure` cookie is simply never sent
      // by the browser over plain `http://localhost`, which would make
      // magic-link sign-in silently fail to persist a session in dev.
      useSecureCookies: !config.insecureCookies,
      // Deliberately *not* setting `crossSubDomainCookies`: the session
      // cookie stays scoped to the browser-visible admin host, per the plan
      // ("no cross-subdomain cookies" — see `docs/membership-lifecycle.md`
      // question 1). With the admin rewrite, the browser stores this
      // host-only cookie for the admin origin and sends it back through the
      // same rewrite. IA-31 owns that integration.
    },
    disabledPaths: [
      // Admin impersonation — see this function's doc comment. Returning a
      // clean 404 at the router level (verified against Better Auth's own
      // `onRequest` handling) is stronger than merely withholding the
      // `impersonate`/`impersonate-admins` permission from the admin role:
      // it can't be silently re-opened by a future `roles`/`adminUserIds`
      // tweak that forgets about this decision.
      "/admin/impersonate-user",
      "/admin/stop-impersonating",
      "/admin/create-user",
      "/admin/update-user",
      "/admin/remove-user",
      "/admin/set-user-password",
    ],
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
        storeToken: "hashed",
        disableSignUp: true,
        sendMagicLink: async ({ email, url }) => {
          await config.emailer.send({
            to: email,
            subject: "el teu enllaç d'accés · iaeste lc lleida",
            react: SignInMagicLink({
              email,
              link: url,
              expiresInMinutes: MAGIC_LINK_EXPIRES_IN_SECONDS / 60,
            }),
          });
        },
      }),
      admin({
        defaultRole: "member",
        adminRoles: ["admin"],
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];

/** Used by domain actions such as kick, ban, or a compromised invitation. */
export async function revokeAllUserSessions(auth: Auth, userId: string) {
  const context = await auth.$context;
  await context.internalAdapter.deleteUserSessions(userId);
}

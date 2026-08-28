import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";

import { can, type Auth, type Capability } from "@repo/auth";
import { getDb } from "@repo/db/client";
import { memberProfile } from "@repo/db/schema";

import { errorBody } from "./api-error";

/**
 * The authenticated admin user, resolved from the session cookie by
 * `requireCapability` and stashed on the Hono context. Route handlers read
 * this instead of trusting anything in the request body — e.g. the reviewer
 * id on registration accept/reject (IA-31).
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
}

declare module "hono" {
  interface ContextVariableMap {
    authUser: AuthUser;
  }
}

export interface RequireCapabilityOptions {
  /**
   * Resolves the Better Auth instance. A getter, not the instance, so the
   * same lazy-construction timing `app.ts` relies on for the `/api/auth/*`
   * mount is preserved (see `lib/auth.ts`).
   */
  getAuth: () => Auth;
  /**
   * Whether the user has completed onboarding (`member_profile` row exists).
   * Overridable so unit tests need neither a real Postgres nor a profile row.
   */
  hasMemberProfile?: (userId: string) => Promise<boolean>;
}

async function defaultHasMemberProfile(userId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ userId: memberProfile.userId })
    .from(memberProfile)
    .where(eq(memberProfile.userId, userId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Server-side authorization for every `/v1/admin/*` route (IA-31). Resolves
 * the session from the forwarded cookie, 401s when there is none, 403s when
 * the session's role lacks `capability` — and 403s when the user has no
 * `member_profile` row, which is the plan's "they can't be in admin without
 * us getting their info" gate. Deliberately does NOT require an active
 * membership in the current campaign: that would lock the whole committee
 * out the instant a rollover makes a fresh campaign current.
 */
export function createRequireCapability(options: RequireCapabilityOptions) {
  const hasMemberProfile = options.hasMemberProfile ?? defaultHasMemberProfile;

  return (capability: Capability): MiddlewareHandler =>
    async (c, next) => {
      const requestId = c.get("requestId");

      let session: Awaited<ReturnType<Auth["api"]["getSession"]>> = null;
      try {
        session = await options.getAuth().api.getSession({
          headers: c.req.raw.headers,
        });
      } catch {
        session = null;
      }

      if (!session?.session || !session.user) {
        return c.json(
          errorBody(
            requestId,
            "UNAUTHENTICATED",
            "Authentication is required.",
          ),
          401,
        );
      }

      if (!can({ user: { role: session.user.role } }, capability)) {
        return c.json(
          errorBody(
            requestId,
            "FORBIDDEN",
            "You do not have access to this resource.",
          ),
          403,
        );
      }

      if (!(await hasMemberProfile(session.user.id))) {
        return c.json(
          errorBody(
            requestId,
            "FORBIDDEN",
            "Complete your member profile before using the admin app.",
          ),
          403,
        );
      }

      c.set("authUser", {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role ?? null,
      });

      return next();
    };
}

export type RequireCapability = ReturnType<typeof createRequireCapability>;

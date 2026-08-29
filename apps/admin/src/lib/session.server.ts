import { cache } from "react";
import { cookies } from "next/headers";

import { env } from "@repo/env/admin/server";

/**
 * The slice of Better Auth's session the shell actually renders or checks.
 * Better Auth returns considerably more; narrowing here keeps the shape the
 * UI depends on explicit.
 */
export interface AdminSessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string | null;
}

export interface AdminSession {
  user: AdminSessionUser;
}

/**
 * Three genuinely different outcomes, kept apart on purpose.
 *
 * `anonymous` and `unreachable` both mean "no session in hand", but they want
 * opposite responses: the first is a redirect to `/sign-in`, the second is an
 * error screen. Collapsing them would send someone to a sign-in page that
 * cannot work — and, because signing in would fail the same way, would loop.
 */
export type SessionResult =
  | { status: "ok"; session: AdminSession }
  | { status: "anonymous" }
  | { status: "unreachable"; message: string };

interface GetSessionResponse {
  user?: {
    id?: unknown;
    email?: unknown;
    name?: unknown;
    image?: unknown;
    role?: unknown;
  } | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Resolves the session server-side.
 *
 * This calls Better Auth's own `/api/auth/get-session` rather than importing
 * `@repo/auth`: that package builds a server instance holding a Postgres pool,
 * and `apps/admin` deliberately has no database access. The API is the only
 * process that talks to the database, here as everywhere else.
 *
 * `cache()`d so a layout and the page it wraps resolve the session once.
 */
export const getServerSession = cache(async (): Promise<SessionResult> => {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return { status: "anonymous" };

  let response: Response;
  try {
    response = await fetch(`${env.API_INTERNAL_URL}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
  } catch (error) {
    return {
      status: "unreachable",
      message: error instanceof Error ? error.message : "error desconegut",
    };
  }

  if (response.status === 401) return { status: "anonymous" };
  if (!response.ok) {
    return {
      status: "unreachable",
      message: `l'api ha respost ${response.status}`,
    };
  }

  const body = (await response.json()) as GetSessionResponse | null;
  const user = body?.user;
  const id = asString(user?.id);
  const email = asString(user?.email);

  // Better Auth answers 200 with a `null` body when the cookie is absent,
  // expired, or points at a revoked session. That is an anonymous visitor,
  // not a failure.
  if (!user || !id || !email) return { status: "anonymous" };

  return {
    status: "ok",
    session: {
      user: {
        id,
        email,
        name: asString(user.name),
        image: asString(user.image),
        role: asString(user.role),
      },
    },
  };
});

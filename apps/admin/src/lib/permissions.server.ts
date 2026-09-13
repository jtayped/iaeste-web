import { redirect } from "next/navigation";

import { can, type Capability } from "@repo/auth";

import { getServerSession } from "@/lib/session.server";

/**
 * Blocks a signed-in user from a page subtree they cannot use. Kept in a
 * server-only module so client navigation can import `can` without pulling in
 * `next/headers` through the session reader.
 */
export async function requirePageCapability(capability: Capability) {
  const result = await getServerSession();
  if (result.status === "ok" && !can(result.session, capability)) redirect("/");
}

/**
 * Whether the signed-in user holds `capability`, for a control a page may
 * render or omit rather than redirect over — the broadcast composer on a table
 * whose own route is gated on something else. The session is `cache()`d, so
 * asking here costs nothing on top of the layout's own check, and the API
 * re-checks the capability on every request regardless.
 */
export async function hasPageCapability(
  capability: Capability,
): Promise<boolean> {
  const result = await getServerSession();
  return result.status === "ok" && can(result.session, capability);
}

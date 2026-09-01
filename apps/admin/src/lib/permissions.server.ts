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

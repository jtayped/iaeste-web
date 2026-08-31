import { redirect } from "next/navigation";

import { can, type Capability } from "@repo/auth";

import { getServerSession } from "@/lib/session.server";

export { can, type Capability };

/**
 * Blocks a signed-in user from a page subtree they cannot use. The parent app
 * layout owns anonymous and API-unreachable states; this helper only handles
 * the page-level permission that differs between authenticated roles.
 */
export async function requirePageCapability(capability: Capability) {
  const result = await getServerSession();
  if (result.status === "ok" && !can(result.session, capability)) redirect("/");
}

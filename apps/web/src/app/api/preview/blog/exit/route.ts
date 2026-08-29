import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";

import { PREVIEW_COOKIE } from "../[id]/route";

export const dynamic = "force-dynamic";

/** Disables Draft Mode and returns to a normal page. */
export async function GET(req: Request) {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_COOKIE);

  const to = new URL(req.url).searchParams.get("to");
  redirect(to && to.startsWith("/") ? to : "/");
}

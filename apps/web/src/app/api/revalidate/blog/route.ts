import { createHmac, timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";

import { env } from "@repo/env/web/server";

import { BLOG_LIST_TAG, blogDocumentTag } from "@/lib/cms-blog-client";

export const dynamic = "force-dynamic";

/**
 * The CMS POSTs here (HMAC-signed with WEB_REVALIDATE_SECRET) after a publish,
 * unpublish or delete. A valid signature invalidates the global blog tag and
 * the affected document tag. A bad signature is a 401; a missing secret means
 * the feature is not configured and the 60s cache lifetime is the only path to
 * convergence.
 */
export async function POST(req: Request) {
  const secret = env.WEB_REVALIDATE_SECRET;
  if (!secret) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const raw = await req.text();
  const provided = req.headers.get("x-revalidate-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "bad_signature" }, { status: 401 });
  }

  let body: { documentId?: string; slugs?: string[]; reason?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_body" }, { status: 400 });
  }

  revalidateTag(BLOG_LIST_TAG);
  if (body.documentId) revalidateTag(blogDocumentTag(body.documentId));

  return Response.json({ revalidated: true, now: Date.now() });
}

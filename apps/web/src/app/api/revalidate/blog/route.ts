import { createHmac, timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";

import { env } from "@repo/env/web/server";

import { BLOG_LIST_TAG, blogDocumentTag } from "@/lib/cms-blog-client";
import {
  EXPERIENCE_LIST_TAG,
  experienceDocumentTag,
} from "@/lib/cms-experiences-client";

export const dynamic = "force-dynamic";

/** Cache tags to drop for each CMS collection: its list tag and one document. */
const TAGS = {
  posts: { list: BLOG_LIST_TAG, document: blogDocumentTag },
  experiences: { list: EXPERIENCE_LIST_TAG, document: experienceDocumentTag },
} as const;

/**
 * The CMS POSTs here (HMAC-signed with WEB_REVALIDATE_SECRET) after a publish,
 * unpublish or delete of a post or an experience. A valid signature
 * invalidates that collection's list tag and the affected document tag. The
 * path says "blog" because every environment's WEB_REVALIDATE_URL points at
 * it. A body without `collection` is a post. A bad signature is a 401; a
 * missing secret means the feature is not configured and the 60s cache
 * lifetime is the only path to convergence.
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

  let body: {
    collection?: string;
    documentId?: string;
    slugs?: string[];
    reason?: string;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_body" }, { status: 400 });
  }

  const collection = body.collection ?? "posts";
  if (collection !== "posts" && collection !== "experiences") {
    return Response.json({ error: "unknown_collection" }, { status: 400 });
  }

  const tags = TAGS[collection];
  revalidateTag(tags.list);
  if (body.documentId) revalidateTag(tags.document(body.documentId));

  return Response.json({ revalidated: true, now: Date.now() });
}

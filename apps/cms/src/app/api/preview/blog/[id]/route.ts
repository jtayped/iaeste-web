import { timingSafeEqual } from "node:crypto";

import {
  blogDetailQuerySchema,
  blogPostDetailSchema,
} from "@repo/constants/validators/blog";

import { env } from "@repo/env/cms/server";

import {
  jsonError,
  jsonOk,
  requestIdFrom,
  upstreamFailure,
} from "../../../../../lib/api-response";
import { getPayloadClient } from "../../../../../lib/payload-client";
import { type RawPost, toDetail } from "../../../../../lib/public-blog-dto";

export const dynamic = "force-dynamic";

function secretMatches(header: string | null): boolean {
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(env.CMS_PREVIEW_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/preview/blog/:id — the latest draft of one article, for the
 * marketing site's Draft Mode. Server-to-server only: it requires the shared
 * `x-preview-secret` header (constant-time compared) and is otherwise a 404,
 * so the endpoint's existence is not observable without the secret.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(req);

  if (!secretMatches(req.headers.get("x-preview-secret"))) {
    return jsonError("not_found", "no trobat", requestId, 404);
  }

  const { id } = await params;
  const parsed = blogDetailQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return jsonError("invalid_request", "locale no vàlid", requestId, 400);
  }

  try {
    const payload = await getPayloadClient();
    const doc = (await payload.findByID({
      collection: "posts",
      id,
      draft: true,
      locale: "all",
      depth: 2,
      overrideAccess: true,
    })) as unknown as RawPost | null;

    if (!doc) {
      return jsonError("not_found", "esborrany no trobat", requestId, 404);
    }

    return jsonOk(
      blogPostDetailSchema.parse(toDetail(doc, parsed.data.locale)),
    );
  } catch (error) {
    return upstreamFailure("blog preview", error, requestId);
  }
}

import {
  blogListQuerySchema,
  blogListResponseSchema,
} from "@repo/constants/validators/blog";

import {
  jsonError,
  jsonOk,
  requestIdFrom,
  upstreamFailure,
} from "../../../../lib/api-response";
import { getPayloadClient } from "../../../../lib/payload-client";
import { type RawPost, toSummary } from "../../../../lib/public-blog-dto";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/blog — published post summaries, newest first, paginated.
 * Every item reports the requested locale, the locale actually rendered and a
 * fallback flag; Catalan is the canonical set (every published article has
 * it), so the list always reads posts in `all` locales and resolves per item.
 */
export async function GET(req: Request) {
  const id = requestIdFrom(req);

  const parsed = blogListQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return jsonError(
      "invalid_request",
      "paràmetres de consulta no vàlids",
      id,
      400,
    );
  }
  const { locale, page, limit } = parsed.data;

  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "posts",
      locale: "all",
      where: { _status: { equals: "published" } },
      sort: "-publishDate",
      page,
      limit,
      depth: 2,
      overrideAccess: true,
      pagination: true,
    });

    const body = blogListResponseSchema.parse({
      items: (result.docs as unknown as RawPost[]).map((doc) =>
        toSummary(doc, locale),
      ),
      page: result.page ?? page,
      limit: result.limit ?? limit,
      totalItems: result.totalDocs,
      totalPages: result.totalPages,
    });

    return jsonOk(body);
  } catch (error) {
    return upstreamFailure("blog list", error, id);
  }
}

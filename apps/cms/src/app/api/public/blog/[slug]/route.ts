import {
  BLOG_FALLBACK_LOCALE,
  blogDetailQuerySchema,
  type BlogLocale,
  blogPostDetailSchema,
} from "@repo/constants/validators/blog";

import {
  jsonError,
  jsonOk,
  requestIdFrom,
  upstreamFailure,
} from "../../../../../lib/api-response";
import { getPayloadClient } from "../../../../../lib/payload-client";
import { type RawPost, toDetail } from "../../../../../lib/public-blog-dto";

export const dynamic = "force-dynamic";

type PayloadClient = Awaited<ReturnType<typeof getPayloadClient>>;

async function findPublishedIdBySlug(
  payload: PayloadClient,
  slug: string,
  locale: BlogLocale,
): Promise<string | number | null> {
  const result = await payload.find({
    collection: "posts",
    locale,
    where: {
      and: [{ _status: { equals: "published" } }, { slug: { equals: slug } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs[0]?.id ?? null;
}

/**
 * GET /api/public/blog/:slug — one published article.
 *
 * Resolution: exact match on the requested locale's slug; then, if the
 * requested locale is not Catalan, the published Catalan slug; otherwise 404.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const id = requestIdFrom(req);
  const { slug } = await params;

  const parsed = blogDetailQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return jsonError("invalid_request", "locale no vàlid", id, 400);
  }
  const { locale } = parsed.data;

  try {
    const payload = await getPayloadClient();

    let docId = await findPublishedIdBySlug(payload, slug, locale);
    if (docId == null && locale !== BLOG_FALLBACK_LOCALE) {
      docId = await findPublishedIdBySlug(payload, slug, BLOG_FALLBACK_LOCALE);
    }
    if (docId == null) {
      return jsonError("not_found", "article no trobat", id, 404);
    }

    const doc = (await payload.findByID({
      collection: "posts",
      id: docId,
      locale: "all",
      depth: 2,
      overrideAccess: true,
    })) as unknown as RawPost;

    return jsonOk(blogPostDetailSchema.parse(toDetail(doc, locale)));
  } catch (error) {
    return upstreamFailure("blog detail", error, id);
  }
}

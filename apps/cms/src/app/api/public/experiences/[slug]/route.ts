import {
  BLOG_FALLBACK_LOCALE,
  type BlogLocale,
} from "@repo/constants/validators/blog";
import {
  experienceDetailQuerySchema,
  experienceDetailSchema,
} from "@repo/constants/validators/experiences";

import {
  jsonError,
  jsonOk,
  requestIdFrom,
  upstreamFailure,
} from "../../../../../lib/api-response";
import { getPayloadClient } from "../../../../../lib/payload-client";
import {
  type RawExperience,
  toDetail,
} from "../../../../../lib/public-experience-dto";

export const dynamic = "force-dynamic";

type PayloadClient = Awaited<ReturnType<typeof getPayloadClient>>;

async function findPublishedIdBySlug(
  payload: PayloadClient,
  slug: string,
  locale: BlogLocale,
): Promise<string | number | null> {
  const result = await payload.find({
    collection: "experiences",
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
 * GET /api/public/experiences/:slug — one published experience.
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

  const parsed = experienceDetailQuerySchema.safeParse(
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
      return jsonError("not_found", "experiència no trobada", id, 404);
    }

    const doc = (await payload.findByID({
      collection: "experiences",
      id: docId,
      locale: "all",
      depth: 1,
      overrideAccess: true,
    })) as unknown as RawExperience;

    return jsonOk(experienceDetailSchema.parse(toDetail(doc, locale)));
  } catch (error) {
    return upstreamFailure("experience detail", error, id);
  }
}

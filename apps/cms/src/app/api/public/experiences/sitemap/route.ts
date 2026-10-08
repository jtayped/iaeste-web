import type { BlogLocale } from "@repo/constants/validators/blog";
import { experienceSitemapResponseSchema } from "@repo/constants/validators/experiences";

import { env } from "@repo/env/cms/server";

import {
  jsonOk,
  requestIdFrom,
  upstreamFailure,
} from "../../../../../lib/api-response";
import { getPayloadClient } from "../../../../../lib/payload-client";
import {
  completeLocales,
  type RawExperience,
} from "../../../../../lib/public-experience-dto";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/experiences/sitemap — one entry per complete published
 * locale URL with its last-modified date. Fallback URLs are never sitemap
 * entries, so only locales whose title, slug, quote and body are all present
 * are emitted.
 */
export async function GET(req: Request) {
  const id = requestIdFrom(req);

  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "experiences",
      locale: "all",
      where: { _status: { equals: "published" } },
      sort: "-publishDate",
      limit: 1000,
      depth: 0,
      overrideAccess: true,
      pagination: false,
    });

    const entries = (result.docs as unknown as RawExperience[]).flatMap((doc) =>
      completeLocales(doc).map((locale: BlogLocale) => ({
        locale,
        slug: doc.slug?.[locale] ?? "",
        url: `${env.WEB_PUBLIC_ORIGIN}/${locale}/experiences/${doc.slug?.[locale] ?? ""}`,
        lastModified:
          doc.updatedAt ?? doc.publishDate ?? new Date().toISOString(),
      })),
    );

    return jsonOk(experienceSitemapResponseSchema.parse({ entries }));
  } catch (error) {
    return upstreamFailure("experience sitemap", error, id);
  }
}

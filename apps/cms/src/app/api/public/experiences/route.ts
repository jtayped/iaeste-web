import type { Where } from "payload";

import {
  experienceListQuerySchema,
  experienceListResponseSchema,
} from "@repo/constants/validators/experiences";

import {
  jsonError,
  jsonOk,
  requestIdFrom,
  upstreamFailure,
} from "../../../../lib/api-response";
import { getPayloadClient } from "../../../../lib/payload-client";
import {
  type RawExperience,
  toSummary,
} from "../../../../lib/public-experience-dto";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/experiences — published experience summaries, newest first,
 * paginated. `?featured=true` narrows the list to the ones marked for the
 * student page. Each item reports the requested locale, the locale actually
 * rendered and a fallback flag, like the blog list.
 */
export async function GET(req: Request) {
  const id = requestIdFrom(req);

  const parsed = experienceListQuerySchema.safeParse(
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
  const { locale, page, limit, featured } = parsed.data;

  const where: Where = { _status: { equals: "published" } };
  if (featured !== undefined) where.featured = { equals: featured };

  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "experiences",
      locale: "all",
      where,
      sort: "-publishDate",
      page,
      limit,
      depth: 1,
      overrideAccess: true,
      pagination: true,
    });

    const body = experienceListResponseSchema.parse({
      items: (result.docs as unknown as RawExperience[]).map((doc) =>
        toSummary(doc, locale),
      ),
      page: result.page ?? page,
      limit: result.limit ?? limit,
      totalItems: result.totalDocs,
      totalPages: result.totalPages,
    });

    return jsonOk(body);
  } catch (error) {
    return upstreamFailure("experience list", error, id);
  }
}

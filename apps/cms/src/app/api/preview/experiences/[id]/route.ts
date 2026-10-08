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
import { previewSecretMatches } from "../../../../../lib/signed-preview";

export const dynamic = "force-dynamic";

/**
 * GET /api/preview/experiences/:id — the latest draft of one experience, for
 * the marketing site's Draft Mode. Server-to-server only: it requires the shared
 * `x-preview-secret` header (constant-time compared) and is otherwise a 404,
 * so the endpoint's existence is not observable without the secret.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(req);

  if (!previewSecretMatches(req.headers.get("x-preview-secret"))) {
    return jsonError("not_found", "no trobat", requestId, 404);
  }

  const { id } = await params;
  const parsed = experienceDetailQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return jsonError("invalid_request", "locale no vàlid", requestId, 400);
  }

  try {
    const payload = await getPayloadClient();
    const doc = (await payload.findByID({
      collection: "experiences",
      id,
      draft: true,
      locale: "all",
      depth: 1,
      overrideAccess: true,
    })) as unknown as RawExperience | null;

    if (!doc) {
      return jsonError("not_found", "esborrany no trobat", requestId, 404);
    }

    return jsonOk(
      experienceDetailSchema.parse(toDetail(doc, parsed.data.locale)),
    );
  } catch (error) {
    return upstreamFailure("experience preview", error, requestId);
  }
}

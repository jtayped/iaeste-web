import { redirect } from "next/navigation";

import { fetchExperiencePreview } from "@/lib/cms-experiences-client";
import { rememberPreviewTarget, verifyPreviewToken } from "@/lib/preview-token";

export const dynamic = "force-dynamic";

/**
 * Entry point for a CMS preview link to an experience. Verifies the
 * short-lived HMAC token, turns on Next.js Draft Mode, remembers which
 * document and locale to show, and redirects to the experience's URL, where
 * the page reads the draft by id. `/api/preview/blog/exit` ends the session.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token") ?? "";

  const claims = verifyPreviewToken(token);
  if (!claims || claims.collection !== "experiences" || claims.id !== id) {
    return new Response(
      "l'enllaç de previsualització no és vàlid o ha caducat",
      { status: 401 },
    );
  }

  const draft = await fetchExperiencePreview(id, claims.locale).catch(
    () => null,
  );
  if (!draft) {
    return new Response("no s'ha pogut carregar l'esborrany", { status: 502 });
  }

  await rememberPreviewTarget({
    collection: "experiences",
    id,
    locale: claims.locale,
  });

  redirect(`/${claims.locale}/experiences/${draft.slug}`);
}

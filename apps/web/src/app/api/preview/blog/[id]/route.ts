import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";

import { fetchBlogPreview } from "@/lib/cms-blog-client";
import { verifyPreviewToken } from "@/lib/preview-token";

export const dynamic = "force-dynamic";

export const PREVIEW_COOKIE = "blog-preview";

/**
 * Entry point for a CMS preview link. Verifies the short-lived HMAC token,
 * turns on Next.js Draft Mode, remembers which document/locale to show, and
 * redirects to the real article URL. The article page reads the draft by id
 * while Draft Mode is active.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  const claims = verifyPreviewToken(token);
  if (!claims || claims.id !== id) {
    return new Response(
      "l'enllaç de previsualització no és vàlid o ha caducat",
      { status: 401 },
    );
  }

  const draft = await fetchBlogPreview(id, claims.locale).catch(() => null);
  if (!draft) {
    return new Response("no s'ha pogut carregar l'esborrany", { status: 502 });
  }

  (await draftMode()).enable();
  (await cookies()).set(
    PREVIEW_COOKIE,
    JSON.stringify({ id, locale: claims.locale }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60,
    },
  );

  redirect(`/${claims.locale}/blog/${draft.slug}`);
}

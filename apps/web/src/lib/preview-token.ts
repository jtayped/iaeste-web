import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies, draftMode } from "next/headers";

import { env } from "@repo/env/web/server";

/**
 * Verifier for the CMS's signed preview links. This is a copy of
 * `verifyPreviewToken` in `apps/cms/src/lib/signed-preview.ts`; the two live
 * in different apps and cannot share a module, so keep both on the same wire
 * format: `base64url(collection.id.locale.exp) + "." + hex hmac-sha256`.
 * Server-only; `CMS_PREVIEW_SECRET` never reaches the browser.
 */

const LOCALES = ["ca", "es", "en"] as const;
export type PreviewLocale = (typeof LOCALES)[number];

const COLLECTIONS = ["posts", "experiences"] as const;
export type PreviewCollection = (typeof COLLECTIONS)[number];

/**
 * Name of the httpOnly cookie that remembers which document/locale a preview
 * session is showing. Lives here rather than in the preview route because a
 * Next.js `route.ts` may only export route handlers and config.
 */
export const PREVIEW_COOKIE = "cms-preview";

export type PreviewClaims = {
  collection: PreviewCollection;
  id: string;
  locale: PreviewLocale;
  exp: number;
};

export function verifyPreviewToken(
  token: string,
  now: number = Date.now(),
): PreviewClaims | null {
  const secret = env.CMS_PREVIEW_SECRET;
  if (!secret) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  let body: string;
  try {
    body = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [collection, id, locale, expRaw] = body.split(".");
  const exp = Number(expRaw);
  if (
    !COLLECTIONS.includes(collection as PreviewCollection) ||
    !id ||
    !LOCALES.includes(locale as PreviewLocale) ||
    !Number.isFinite(exp)
  ) {
    return null;
  }
  if (exp < now) return null;

  return {
    collection: collection as PreviewCollection,
    id,
    locale: locale as PreviewLocale,
    exp,
  };
}

/** What the preview cookie remembers: one document in one locale. */
export type PreviewTarget = Pick<PreviewClaims, "collection" | "id" | "locale">;

export async function rememberPreviewTarget(target: PreviewTarget) {
  (await draftMode()).enable();
  (await cookies()).set(PREVIEW_COOKIE, JSON.stringify(target), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60,
  });
}

/**
 * The id of the document being previewed, when Draft Mode is on and the
 * preview cookie points at a document of `collection` in `locale`.
 */
export async function previewedDocumentId(
  collection: PreviewCollection,
  locale: string,
): Promise<string | null> {
  if (!(await draftMode()).isEnabled) return null;

  const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (!raw) return null;

  let target: Partial<PreviewTarget>;
  try {
    target = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    target.collection !== collection ||
    !target.id ||
    target.locale !== locale
  ) {
    return null;
  }
  return target.id;
}

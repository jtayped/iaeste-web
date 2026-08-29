import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@repo/env/web/server";

/**
 * Verifier for the CMS's signed preview links. This is a byte-for-byte copy of
 * `verifyPreviewToken` in `apps/cms/src/lib/signed-preview.ts` — the two live
 * in different apps and cannot share a module, so the wire format
 * (`base64url(id.locale.exp) + "." + hex hmac-sha256`) is pinned by a test on
 * each side. Server-only; `CMS_PREVIEW_SECRET` never reaches the browser.
 */

const LOCALES = ["ca", "es", "en"] as const;
export type PreviewLocale = (typeof LOCALES)[number];

/**
 * Name of the httpOnly cookie that remembers which document/locale a preview
 * session is showing. Lives here rather than in the preview route because a
 * Next.js `route.ts` may only export route handlers and config.
 */
export const PREVIEW_COOKIE = "blog-preview";

export type PreviewClaims = {
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

  const [id, locale, expRaw] = body.split(".");
  const exp = Number(expRaw);
  if (
    !id ||
    !LOCALES.includes(locale as PreviewLocale) ||
    !Number.isFinite(exp)
  ) {
    return null;
  }
  if (exp < now) return null;

  return { id, locale: locale as PreviewLocale, exp };
}

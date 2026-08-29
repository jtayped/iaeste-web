import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@repo/env/cms/server";

/**
 * Short-lived signed preview links. Payload's `admin.preview` builds one of
 * these; `apps/web` re-verifies it with the same `CMS_PREVIEW_SECRET` before
 * enabling Draft Mode. The signature binds the post id, locale and expiry so a
 * link cannot be widened or replayed after it lapses.
 *
 * `apps/web` carries a byte-for-byte copy of `verifyPreviewToken`; keep the
 * two in sync (there is a test on the web side that pins the wire format).
 */

export const PREVIEW_TTL_MS = 10 * 60 * 1000;

const LOCALES = ["ca", "es", "en"] as const;
export type PreviewLocale = (typeof LOCALES)[number];

export type PreviewClaims = {
  id: string;
  locale: PreviewLocale;
  exp: number;
};

function payload(claims: PreviewClaims): string {
  return `${claims.id}.${claims.locale}.${claims.exp}`;
}

function sign(data: string): string {
  return createHmac("sha256", env.CMS_PREVIEW_SECRET)
    .update(data)
    .digest("hex");
}

/** Build the `token` query param for a preview URL. */
export function createPreviewToken(
  id: string,
  locale: PreviewLocale,
  now: number = Date.now(),
): string {
  const claims: PreviewClaims = { id, locale, exp: now + PREVIEW_TTL_MS };
  const body = payload(claims);
  return `${Buffer.from(body).toString("base64url")}.${sign(body)}`;
}

/** Verify a token. Returns the claims, or `null` for any tampering/expiry. */
export function verifyPreviewToken(
  token: string,
  now: number = Date.now(),
): PreviewClaims | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  let body: string;
  try {
    body = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(body);
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

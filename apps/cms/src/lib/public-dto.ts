import {
  BLOG_FALLBACK_LOCALE,
  type BlogCoverImage,
  type BlogLocale,
} from "@repo/constants/validators/blog";

import { env } from "@repo/env/cms/server";

/**
 * Helpers shared by the public DTO mappers (`public-blog-dto.ts`,
 * `public-experience-dto.ts`). They read Payload documents fetched with
 * `locale: "all"`, so localized fields arrive as `{ ca, es, en }` maps.
 */

export type LocaleMap<T> = Partial<Record<BlogLocale, T>>;

type RawMediaSize = {
  url?: string | null;
  width?: number | null;
  height?: number | null;
};

export type RawMedia = RawMediaSize & {
  alt?: string | LocaleMap<string> | null;
  sizes?: { card?: RawMediaSize | null; hero?: RawMediaSize | null } | null;
};

/** An upload field: the populated document, or a bare id at depth 0. */
export type RawUpload = RawMedia | string | number | null | undefined;

export const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** The value for `locale`, or the Catalan one when that locale is empty. */
export function pickLocalized<T>(
  map: LocaleMap<T> | null | undefined,
  locale: BlogLocale,
): T | undefined {
  if (!map) return undefined;
  return map[locale] ?? map[BLOG_FALLBACK_LOCALE];
}

function absoluteUrl(url: string | null | undefined): string | null {
  if (!nonEmpty(url)) return null;
  try {
    return new URL(url, env.CMS_PUBLIC_ORIGIN).toString();
  } catch {
    return null;
  }
}

function rendition(size: RawMediaSize | null | undefined) {
  const url = absoluteUrl(size?.url);
  if (!url || !size?.width || !size?.height) return null;
  return { url, width: size.width, height: size.height };
}

/** A populated media document as the public image shape, alt text localized. */
export function toImage(
  raw: RawUpload,
  locale: BlogLocale,
): BlogCoverImage | null {
  if (!raw || typeof raw !== "object") return null;

  const original = rendition(raw);
  if (!original) return null;

  const alt =
    typeof raw.alt === "string"
      ? raw.alt
      : (pickLocalized(raw.alt ?? undefined, locale) ?? "");

  return {
    alt,
    original,
    card: rendition(raw.sizes?.card),
    hero: rendition(raw.sizes?.hero),
  };
}

export type ResolvedLocale = {
  requestedLocale: BlogLocale;
  contentLocale: BlogLocale;
  isFallback: boolean;
};

/**
 * Which locale's content to serve: the requested one when its translation is
 * complete, Catalan otherwise. Catalan always counts as complete, because the
 * publish gate refuses a document without it.
 */
export function resolveLocale(
  requestedLocale: BlogLocale,
  isComplete: (locale: BlogLocale) => boolean,
): ResolvedLocale {
  if (requestedLocale === BLOG_FALLBACK_LOCALE || isComplete(requestedLocale)) {
    return {
      requestedLocale,
      contentLocale: requestedLocale,
      isFallback: false,
    };
  }
  return {
    requestedLocale,
    contentLocale: BLOG_FALLBACK_LOCALE,
    isFallback: true,
  };
}

import {
  BLOG_FALLBACK_LOCALE,
  BLOG_LOCALES,
  type BlogCoverImage,
  type BlogLocale,
  type BlogPostDetail,
  type BlogPostSummary,
} from "@repo/constants/validators/blog";

import { env } from "@repo/env/cms/server";

/**
 * Maps Payload documents read with `locale: "all"` onto the narrow public
 * DTOs. All locale resolution — fallback to Catalan, completeness, tag-label
 * fallback, media URL normalization — happens here so the route handlers stay
 * thin and `apps/web` never sees Payload's shape.
 */

type LocaleMap<T> = Partial<Record<BlogLocale, T>>;

type RawMediaSize = {
  url?: string | null;
  width?: number | null;
  height?: number | null;
};

type RawMedia = RawMediaSize & {
  alt?: string | LocaleMap<string> | null;
  sizes?: { card?: RawMediaSize | null; hero?: RawMediaSize | null } | null;
};

type RawTag = {
  key?: string | null;
  label?: string | LocaleMap<string> | null;
};

export type RawPost = {
  id: string | number;
  _status?: string | null;
  author?: string | null;
  publishDate?: string | null;
  updatedAt?: string | null;
  title?: LocaleMap<string> | null;
  slug?: LocaleMap<string> | null;
  excerpt?: LocaleMap<string> | null;
  body?: LocaleMap<unknown> | null;
  coverImage?: LocaleMap<RawMedia | string | number | null> | null;
  tags?: (RawTag | string | number)[] | null;
};

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** A translation counts as available only when all four fields are present. */
export function localeIsComplete(post: RawPost, locale: BlogLocale): boolean {
  return (
    nonEmpty(post.title?.[locale]) &&
    nonEmpty(post.slug?.[locale]) &&
    nonEmpty(post.excerpt?.[locale]) &&
    post.body?.[locale] != null
  );
}

/** Locales whose content is fully translated, Catalan always first. */
export function completeLocales(post: RawPost): BlogLocale[] {
  return BLOG_LOCALES.filter((locale) => localeIsComplete(post, locale));
}

function pickLocalized<T>(
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

function toCoverImage(
  raw: RawMedia | string | number | null | undefined,
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

function toTags(raw: RawPost["tags"], locale: BlogLocale) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((tag): tag is RawTag => !!tag && typeof tag === "object")
    .map((tag) => {
      const key = nonEmpty(tag.key) ? tag.key : "";
      const label =
        typeof tag.label === "string"
          ? tag.label
          : (pickLocalized(tag.label ?? undefined, locale) ?? key);
      return { key, label };
    })
    .filter((tag) => tag.key.length > 0);
}

export type ResolvedLocale = {
  requestedLocale: BlogLocale;
  contentLocale: BlogLocale;
  isFallback: boolean;
};

/** Which locale's content to actually serve for a requested locale. */
export function resolveLocale(
  post: RawPost,
  requestedLocale: BlogLocale,
): ResolvedLocale {
  if (
    requestedLocale === BLOG_FALLBACK_LOCALE ||
    localeIsComplete(post, requestedLocale)
  ) {
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

export function toSummary(
  post: RawPost,
  requestedLocale: BlogLocale,
): BlogPostSummary {
  const resolved = resolveLocale(post, requestedLocale);
  const c = resolved.contentLocale;

  return {
    id: String(post.id),
    requestedLocale: resolved.requestedLocale,
    contentLocale: resolved.contentLocale,
    isFallback: resolved.isFallback,
    slug: pickLocalized(post.slug, c) ?? "",
    title: pickLocalized(post.title, c) ?? "",
    excerpt: pickLocalized(post.excerpt, c) ?? "",
    author: post.author ?? "iaeste lc lleida",
    publishDate: post.publishDate ?? post.updatedAt ?? new Date().toISOString(),
    tags: toTags(post.tags, c),
    coverImage: toCoverImage(pickLocalized(post.coverImage, c), c),
  };
}

export function toDetail(
  post: RawPost,
  requestedLocale: BlogLocale,
): BlogPostDetail {
  const summary = toSummary(post, requestedLocale);
  const c = summary.contentLocale;

  return {
    ...summary,
    body: (post.body?.[c] ?? { root: {} }) as BlogPostDetail["body"],
    alternates: completeLocales(post).map((locale) => ({
      locale,
      slug: post.slug?.[locale] ?? "",
    })),
  };
}

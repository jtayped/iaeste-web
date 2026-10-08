import {
  BLOG_LOCALES,
  type BlogLocale,
  type BlogPostDetail,
  type BlogPostSummary,
} from "@repo/constants/validators/blog";

import {
  type LocaleMap,
  nonEmpty,
  pickLocalized,
  type RawUpload,
  resolveLocale,
  toImage,
} from "./public-dto";

/**
 * Maps Payload documents read with `locale: "all"` onto the narrow public
 * DTOs. All locale resolution — fallback to Catalan, completeness, tag-label
 * fallback, media URL normalization — happens here so the route handlers stay
 * thin and `apps/web` never sees Payload's shape.
 */

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
  coverImage?: LocaleMap<RawUpload> | null;
  tags?: (RawTag | string | number)[] | null;
};

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

export function toSummary(
  post: RawPost,
  requestedLocale: BlogLocale,
): BlogPostSummary {
  const resolved = resolveLocale(requestedLocale, (locale) =>
    localeIsComplete(post, locale),
  );
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
    coverImage: toImage(pickLocalized(post.coverImage, c), c),
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

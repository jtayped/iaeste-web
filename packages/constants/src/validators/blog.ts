import { z } from "zod";

/**
 * The stable contract between `apps/cms` (which produces these shapes from
 * Payload's Local API) and `apps/web` (which validates every response against
 * these schemas before rendering). Payload's own generated REST shape must
 * never reach the marketing app — only what is declared here.
 */

export const BLOG_LOCALES = ["ca", "es", "en"] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

export const blogLocaleSchema = z.enum(BLOG_LOCALES);

/** Catalan is the default and fallback locale. */
export const BLOG_FALLBACK_LOCALE: BlogLocale = "ca";

export const BLOG_LIST_DEFAULT_LIMIT = 6;
export const BLOG_LIST_MAX_LIMIT = 20;

export const blogListQuerySchema = z.object({
  locale: blogLocaleSchema.default(BLOG_FALLBACK_LOCALE),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(BLOG_LIST_MAX_LIMIT)
    .default(BLOG_LIST_DEFAULT_LIMIT),
});
export type BlogListQuery = z.infer<typeof blogListQuerySchema>;

export const blogDetailQuerySchema = z.object({
  locale: blogLocaleSchema.default(BLOG_FALLBACK_LOCALE),
});

/** One rendition of a cover image, normalized against `CMS_PUBLIC_ORIGIN`. */
export const blogImageRenditionSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const blogCoverImageSchema = z.object({
  alt: z.string(),
  original: blogImageRenditionSchema,
  card: blogImageRenditionSchema.nullable(),
  hero: blogImageRenditionSchema.nullable(),
});
export type BlogCoverImage = z.infer<typeof blogCoverImageSchema>;

export const blogTagSchema = z.object({
  key: z.string(),
  label: z.string(),
});

export const blogPostSummarySchema = z.object({
  id: z.string(),
  /** The locale the caller asked for. */
  requestedLocale: blogLocaleSchema,
  /** The locale actually rendered — Catalan when the request fell back. */
  contentLocale: blogLocaleSchema,
  isFallback: z.boolean(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  author: z.string(),
  publishDate: z.string(),
  tags: z.array(blogTagSchema),
  coverImage: blogCoverImageSchema.nullable(),
});
export type BlogPostSummary = z.infer<typeof blogPostSummarySchema>;

/**
 * Serialized Lexical editor state. Kept structurally loose on purpose: the
 * shared package does not depend on Payload types, and the web renderer uses
 * the official Lexical converters for the real walk. Only the outer `root`
 * envelope is asserted.
 */
export const lexicalStateSchema = z
  .object({ root: z.record(z.string(), z.unknown()) })
  .and(z.record(z.string(), z.unknown()));
export type LexicalState = z.infer<typeof lexicalStateSchema>;

/** A complete translation of an article, for `<link rel="alternate">`. */
export const blogAlternateSchema = z.object({
  locale: blogLocaleSchema,
  slug: z.string(),
});

export const blogPostDetailSchema = blogPostSummarySchema.extend({
  body: lexicalStateSchema,
  /** Every locale whose title, slug, excerpt and body are all present. */
  alternates: z.array(blogAlternateSchema),
});
export type BlogPostDetail = z.infer<typeof blogPostDetailSchema>;

export const blogListResponseSchema = z.object({
  items: z.array(blogPostSummarySchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type BlogListResponse = z.infer<typeof blogListResponseSchema>;

export const blogSitemapEntrySchema = z.object({
  locale: blogLocaleSchema,
  slug: z.string(),
  url: z.string().url(),
  lastModified: z.string(),
});

export const blogSitemapResponseSchema = z.object({
  entries: z.array(blogSitemapEntrySchema),
});
export type BlogSitemapResponse = z.infer<typeof blogSitemapResponseSchema>;

/** Typed error body carried by every public endpoint, with a request id. */
export const blogErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "invalid_request",
      "not_found",
      "upstream_unavailable",
      "internal",
    ]),
    message: z.string(),
    requestId: z.string(),
  }),
});
export type BlogError = z.infer<typeof blogErrorSchema>;

import { z } from "zod";

import {
  blogAlternateSchema,
  blogCoverImageSchema,
  BLOG_FALLBACK_LOCALE,
  blogLocaleSchema,
  lexicalStateSchema,
} from "./blog";

/**
 * The contract between `apps/cms` and `apps/web` for student experiences:
 * first-person stories from UdL students who did a placement abroad. It works
 * like the blog contract: the CMS maps Payload documents onto these shapes and
 * the site validates every response before rendering. Locales, images, rich
 * text and alternates reuse the blog's schemas.
 */

export const EXPERIENCE_LIST_DEFAULT_LIMIT = 12;
export const EXPERIENCE_LIST_MAX_LIMIT = 24;

export const experienceListQuerySchema = z.object({
  locale: blogLocaleSchema.default(BLOG_FALLBACK_LOCALE),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(EXPERIENCE_LIST_MAX_LIMIT)
    .default(EXPERIENCE_LIST_DEFAULT_LIMIT),
  /** `true` narrows the list to experiences marked for the student page. */
  featured: z.stringbool().optional(),
});
export type ExperienceListQuery = z.infer<typeof experienceListQuerySchema>;

export const experienceDetailQuerySchema = z.object({
  locale: blogLocaleSchema.default(BLOG_FALLBACK_LOCALE),
});

/** ISO 3166-1 alpha-2. The site prints the name with `Intl.DisplayNames`. */
export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/);

/** A calendar month, `YYYY-MM`. Placements are dated to the month. */
export const yearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const experienceSummarySchema = z.object({
  id: z.string(),
  /** The locale the caller asked for. */
  requestedLocale: blogLocaleSchema,
  /** The locale actually rendered. Catalan when the request fell back. */
  contentLocale: blogLocaleSchema,
  isFallback: z.boolean(),
  slug: z.string(),
  title: z.string(),
  studentName: z.string(),
  degree: z.string().nullable(),
  /** What they did, in a few words. Shown under the name. */
  role: z.string().nullable(),
  /** Null only on an unfinished draft; publishing requires it. */
  country: countryCodeSchema.nullable(),
  city: z.string().nullable(),
  hostCompany: z.string().nullable(),
  startDate: yearMonthSchema.nullable(),
  endDate: yearMonthSchema.nullable(),
  /** One sentence in the student's own words. */
  quote: z.string(),
  photo: blogCoverImageSchema.nullable(),
  publishDate: z.string(),
  featured: z.boolean(),
});
export type ExperienceSummary = z.infer<typeof experienceSummarySchema>;

export const experienceDetailSchema = experienceSummarySchema.extend({
  body: lexicalStateSchema,
  gallery: z.array(blogCoverImageSchema),
  /** Every locale whose title, slug, quote and body are all present. */
  alternates: z.array(blogAlternateSchema),
});
export type ExperienceDetail = z.infer<typeof experienceDetailSchema>;

export const experienceListResponseSchema = z.object({
  items: z.array(experienceSummarySchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type ExperienceListResponse = z.infer<
  typeof experienceListResponseSchema
>;

export const experienceSitemapEntrySchema = z.object({
  locale: blogLocaleSchema,
  slug: z.string(),
  url: z.string().url(),
  lastModified: z.string(),
});

export const experienceSitemapResponseSchema = z.object({
  entries: z.array(experienceSitemapEntrySchema),
});
export type ExperienceSitemapResponse = z.infer<
  typeof experienceSitemapResponseSchema
>;

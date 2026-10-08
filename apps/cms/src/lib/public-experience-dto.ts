import { BLOG_LOCALES, type BlogLocale } from "@repo/constants/validators/blog";
import type {
  ExperienceDetail,
  ExperienceSummary,
} from "@repo/constants/validators/experiences";

import {
  type LocaleMap,
  nonEmpty,
  pickLocalized,
  type RawUpload,
  resolveLocale,
  toImage,
} from "./public-dto";

/**
 * Maps `experiences` documents read with `locale: "all"` onto the public DTOs
 * in `@repo/constants/validators/experiences`. Locale fallback, completeness
 * and media URLs are resolved here, as `public-blog-dto.ts` does for posts.
 */

export type RawExperience = {
  id: string | number;
  _status?: string | null;
  publishDate?: string | null;
  updatedAt?: string | null;
  featured?: boolean | null;
  title?: LocaleMap<string> | null;
  slug?: LocaleMap<string> | null;
  studentName?: string | null;
  degree?: LocaleMap<string> | null;
  role?: LocaleMap<string> | null;
  country?: string | null;
  city?: LocaleMap<string> | null;
  hostCompany?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  quote?: LocaleMap<string> | null;
  photo?: RawUpload;
  gallery?: RawUpload[] | null;
  body?: LocaleMap<unknown> | null;
};

/** A translation counts as available when title, slug, quote and body are all present. */
export function localeIsComplete(
  experience: RawExperience,
  locale: BlogLocale,
): boolean {
  return (
    nonEmpty(experience.title?.[locale]) &&
    nonEmpty(experience.slug?.[locale]) &&
    nonEmpty(experience.quote?.[locale]) &&
    experience.body?.[locale] != null
  );
}

/** Locales whose content is fully translated, Catalan always first. */
export function completeLocales(experience: RawExperience): BlogLocale[] {
  return BLOG_LOCALES.filter((locale) => localeIsComplete(experience, locale));
}

function text(value: string | null | undefined): string | null {
  return nonEmpty(value) ? value.trim() : null;
}

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

/**
 * `YYYY-MM` from a Payload date. The admin's month picker stores the first of
 * the month at 12:00 UTC, but a date written through the API at local
 * midnight lands on the previous evening in UTC. Reading the month half a
 * day later gives the intended month for both.
 */
function yearMonth(value: string | null | undefined): string | null {
  if (!nonEmpty(value)) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time + HALF_DAY_MS).toISOString().slice(0, 7);
}

function countryCode(value: string | null | undefined): string | null {
  return nonEmpty(value) && /^[A-Z]{2}$/.test(value) ? value : null;
}

export function toSummary(
  experience: RawExperience,
  requestedLocale: BlogLocale,
): ExperienceSummary {
  const resolved = resolveLocale(requestedLocale, (locale) =>
    localeIsComplete(experience, locale),
  );
  const c = resolved.contentLocale;

  return {
    id: String(experience.id),
    requestedLocale: resolved.requestedLocale,
    contentLocale: resolved.contentLocale,
    isFallback: resolved.isFallback,
    slug: pickLocalized(experience.slug, c) ?? "",
    title: pickLocalized(experience.title, c) ?? "",
    studentName: experience.studentName?.trim() ?? "",
    degree: text(pickLocalized(experience.degree, c)),
    role: text(pickLocalized(experience.role, c)),
    country: countryCode(experience.country),
    city: text(pickLocalized(experience.city, c)),
    hostCompany: text(experience.hostCompany),
    startDate: yearMonth(experience.startDate),
    endDate: yearMonth(experience.endDate),
    quote: pickLocalized(experience.quote, c) ?? "",
    photo: toImage(experience.photo, c),
    publishDate:
      experience.publishDate ??
      experience.updatedAt ??
      new Date().toISOString(),
    featured: experience.featured === true,
  };
}

export function toDetail(
  experience: RawExperience,
  requestedLocale: BlogLocale,
): ExperienceDetail {
  const summary = toSummary(experience, requestedLocale);
  const c = summary.contentLocale;

  return {
    ...summary,
    body: (experience.body?.[c] ?? { root: {} }) as ExperienceDetail["body"],
    gallery: (experience.gallery ?? [])
      .map((item) => toImage(item, c))
      .filter((image) => image !== null),
    alternates: completeLocales(experience).map((locale) => ({
      locale,
      slug: experience.slug?.[locale] ?? "",
    })),
  };
}

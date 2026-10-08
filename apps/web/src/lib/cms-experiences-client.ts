import type { BlogLocale } from "@repo/constants/validators/blog";
import {
  experienceDetailSchema,
  experienceListResponseSchema,
  experienceSitemapResponseSchema,
  type ExperienceDetail,
  type ExperienceListQuery,
  type ExperienceListResponse,
  type ExperienceSitemapResponse,
} from "@repo/constants/validators/experiences";

import { cmsFetch } from "./cms-client";

/**
 * Client for the CMS experience endpoints. Every response is validated against
 * the shared Zod schema before it reaches a page.
 */

export const EXPERIENCE_LIST_TAG = "experiences";
export const experienceDocumentTag = (id: string) => `experiences:${id}`;

export async function fetchExperienceList(
  query: ExperienceListQuery,
): Promise<ExperienceListResponse> {
  const search = new URLSearchParams({
    locale: query.locale,
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.featured !== undefined) {
    search.set("featured", String(query.featured));
  }
  const raw = await cmsFetch(`/api/public/experiences?${search}`, {
    tags: [EXPERIENCE_LIST_TAG],
  });
  return experienceListResponseSchema.parse(raw);
}

export async function fetchExperience(
  slug: string,
  locale: BlogLocale,
): Promise<ExperienceDetail | null> {
  const raw = await cmsFetch(
    `/api/public/experiences/${encodeURIComponent(slug)}?locale=${locale}`,
    { tags: [EXPERIENCE_LIST_TAG] },
  );
  if (raw == null) return null;
  return experienceDetailSchema.parse(raw);
}

export async function fetchExperiencePreview(
  id: string,
  locale: BlogLocale,
): Promise<ExperienceDetail | null> {
  const raw = await cmsFetch(
    `/api/preview/experiences/${id}?locale=${locale}`,
    { tags: [experienceDocumentTag(id)], preview: { id } },
  );
  if (raw == null) return null;
  return experienceDetailSchema.parse(raw);
}

export async function fetchExperienceSitemap(): Promise<ExperienceSitemapResponse> {
  const raw = await cmsFetch("/api/public/experiences/sitemap", {
    tags: [EXPERIENCE_LIST_TAG],
  });
  return experienceSitemapResponseSchema.parse(raw);
}

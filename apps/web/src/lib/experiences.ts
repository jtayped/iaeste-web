import {
  EXPERIENCE_LIST_MAX_LIMIT,
  type ExperienceDetail,
  type ExperienceSummary,
} from "@repo/constants/validators/experiences";

import { previewedDocumentId } from "@/lib/preview-token";

import type { BlogLocale } from "./blog-types";
import { CmsUnavailableError } from "./cms-client";
import {
  fetchExperience,
  fetchExperienceList,
  fetchExperiencePreview,
  fetchExperienceSitemap,
} from "./cms-experiences-client";

/**
 * CMS-backed reader for student experiences. Pages get the shared DTOs as
 * they are: publication filtering, locale fallback and alternates arrive
 * resolved from the CMS. When the CMS is unreachable (at build time, or a
 * transient blip) lists come back empty and details as not found, and ISR
 * refills them on a later pass.
 */

export type { ExperienceDetail, ExperienceSummary };

export async function getExperiences(
  locale: BlogLocale,
  options: { featured?: boolean; limit?: number } = {},
): Promise<ExperienceSummary[]> {
  const { featured, limit } = options;
  try {
    if (limit !== undefined) {
      const result = await fetchExperienceList({
        locale,
        page: 1,
        limit: Math.min(limit, EXPERIENCE_LIST_MAX_LIMIT),
        featured,
      });
      return result.items;
    }

    const out: ExperienceSummary[] = [];
    for (let page = 1; ; page += 1) {
      const result = await fetchExperienceList({
        locale,
        page,
        limit: EXPERIENCE_LIST_MAX_LIMIT,
        featured,
      });
      out.push(...result.items);
      if (page >= result.totalPages || result.items.length === 0) break;
    }
    return out;
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return [];
  }
}

async function readPreviewIfActive(
  locale: BlogLocale,
  slug: string,
): Promise<ExperienceDetail | null> {
  const id = await previewedDocumentId("experiences", locale);
  if (!id) return null;

  const draft = await fetchExperiencePreview(id, locale);
  if (!draft || draft.slug !== slug) return null;
  return draft;
}

/**
 * One experience by its slug in `locale`, or by its Catalan slug when that
 * locale has no translation. In Draft Mode, the draft being previewed.
 */
export async function getExperience(
  locale: BlogLocale,
  slug: string,
): Promise<ExperienceDetail | null> {
  const preview = await readPreviewIfActive(locale, slug);
  if (preview) return preview;

  try {
    return await fetchExperience(slug, locale);
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return null;
  }
}

/** Every complete published locale URL. Fallback URLs are never listed. */
export async function getExperienceSitemap() {
  try {
    return (await fetchExperienceSitemap()).entries;
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return [];
  }
}

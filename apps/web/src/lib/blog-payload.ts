import { cookies, draftMode } from "next/headers";

import {
  BLOG_LIST_MAX_LIMIT,
  type BlogLocale as CmsLocale,
  type BlogPostDetail,
  type BlogPostSummary,
} from "@repo/constants/validators/blog";

import { PREVIEW_COOKIE } from "@/lib/preview-token";

import {
  fetchBlogList,
  fetchBlogPost,
  fetchBlogPreview,
  CmsUnavailableError,
} from "./cms-blog-client";
import {
  blogLocales,
  type BlogLocale,
  type BlogPost,
  type BlogPostVersion,
} from "./blog-types";

/**
 * CMS-backed blog reader. Every function returns the `BlogPost` shape.
 * Publication filtering, locale fallback and alternates all come resolved
 * from the narrow CMS API.
 */

function toBlogPost(dto: BlogPostSummary | BlogPostDetail): BlogPost {
  const detail = "body" in dto ? dto : null;
  return {
    translationKey: dto.id,
    slug: dto.slug,
    locale: dto.contentLocale,
    requestedLocale: dto.requestedLocale,
    isFallback: dto.isFallback,
    draft: false,
    title: dto.title,
    excerpt: dto.excerpt,
    author: dto.author,
    // Consumers format `publishDate` as a calendar date; the CMS returns a
    // full ISO timestamp, so trim it to `YYYY-MM-DD`.
    publishDate: dto.publishDate.slice(0, 10),
    tags: dto.tags.map((tag) => tag.label),
    coverImage: dto.coverImage?.hero?.url ?? dto.coverImage?.original.url ?? "",
    coverImageMeta: dto.coverImage
      ? {
          width: (dto.coverImage.hero ?? dto.coverImage.original).width,
          height: (dto.coverImage.hero ?? dto.coverImage.original).height,
        }
      : null,
    bodyLexical: detail?.body ?? null,
    alternates: detail
      ? detail.alternates.map((alt): BlogPostVersion => ({
          locale: alt.locale,
          slug: alt.slug,
        }))
      : null,
  };
}

async function collectAll(locale: BlogLocale): Promise<BlogPost[]> {
  const out: BlogPost[] = [];
  let page = 1;
  try {
    // Small dataset; page through the bounded list endpoint.
    for (;;) {
      const result = await fetchBlogList({
        locale: locale as CmsLocale,
        page,
        limit: BLOG_LIST_MAX_LIMIT,
      });
      out.push(...result.items.map(toBlogPost));
      if (page >= result.totalPages || result.items.length === 0) break;
      page += 1;
    }
  } catch (error) {
    // The CMS being unreachable (build time, or a transient blip) yields an
    // empty list rather than a failed render; ISR refills on the next pass.
    if (!(error instanceof CmsUnavailableError)) throw error;
    return [];
  }
  return out;
}

export async function getPostsInLocale(
  locale: BlogLocale,
): Promise<BlogPost[]> {
  return collectAll(locale);
}

export async function getBlogPosts(locale: BlogLocale): Promise<BlogPost[]> {
  return collectAll(locale);
}

async function readPreviewIfActive(
  requestedLocale: BlogLocale,
  slug: string,
): Promise<BlogPost | null> {
  if (!(await draftMode()).isEnabled) return null;

  const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (!raw) return null;

  let claim: { id?: string; locale?: string };
  try {
    claim = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!claim.id || claim.locale !== requestedLocale) return null;

  const draft = await fetchBlogPreview(claim.id, requestedLocale as CmsLocale);
  if (!draft || draft.slug !== slug) return null;
  return toBlogPost(draft);
}

export async function getBlogPost(
  requestedLocale: BlogLocale,
  slug: string,
): Promise<BlogPost | null> {
  const preview = await readPreviewIfActive(requestedLocale, slug);
  if (preview) return preview;

  try {
    const detail = await fetchBlogPost(slug, requestedLocale as CmsLocale);
    return detail ? toBlogPost(detail) : null;
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return null;
  }
}

export async function getPostVersions(
  translationKey: string,
): Promise<BlogPostVersion[]> {
  // `translationKey` is the document id; alternates are cheaper to read from a
  // detail response, but callers that only have the id fall back to a scan.
  for (const locale of blogLocales) {
    try {
      const posts = await collectAll(locale);
      const match = posts.find(
        (post) => post.translationKey === translationKey,
      );
      if (match?.alternates) return match.alternates;
    } catch (error) {
      if (!(error instanceof CmsUnavailableError)) throw error;
    }
  }
  return [];
}

/** New posts are routable without a rebuild, so nothing is pre-generated. */
export async function getStaticPostParams(): Promise<
  { locale: BlogLocale; slug: string }[]
> {
  return [];
}

export async function getStaticPaginationParams(): Promise<
  { locale: BlogLocale; page: string }[]
> {
  return [];
}

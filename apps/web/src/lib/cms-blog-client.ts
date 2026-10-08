import {
  blogListResponseSchema,
  blogPostDetailSchema,
  blogSitemapResponseSchema,
  type BlogListQuery,
  type BlogListResponse,
  type BlogLocale,
  type BlogPostDetail,
  type BlogSitemapResponse,
} from "@repo/constants/validators/blog";

import { cmsFetch } from "./cms-client";

/**
 * Client for the CMS blog endpoints. Every response is validated against the
 * shared Zod schema before it reaches a page.
 */

export const BLOG_LIST_TAG = "blog";
export const blogDocumentTag = (id: string) => `blog:${id}`;

export async function fetchBlogList(
  query: BlogListQuery,
): Promise<BlogListResponse> {
  const search = new URLSearchParams({
    locale: query.locale,
    page: String(query.page),
    limit: String(query.limit),
  });
  const raw = await cmsFetch(`/api/public/blog?${search}`, {
    tags: [BLOG_LIST_TAG],
  });
  return blogListResponseSchema.parse(raw);
}

export async function fetchBlogPost(
  slug: string,
  locale: BlogLocale,
): Promise<BlogPostDetail | null> {
  const raw = await cmsFetch(
    `/api/public/blog/${encodeURIComponent(slug)}?locale=${locale}`,
    { tags: [BLOG_LIST_TAG] },
  );
  if (raw == null) return null;
  return blogPostDetailSchema.parse(raw);
}

export async function fetchBlogPreview(
  id: string,
  locale: BlogLocale,
): Promise<BlogPostDetail | null> {
  const raw = await cmsFetch(`/api/preview/blog/${id}?locale=${locale}`, {
    tags: [blogDocumentTag(id)],
    preview: { id },
  });
  if (raw == null) return null;
  return blogPostDetailSchema.parse(raw);
}

export async function fetchBlogSitemap(): Promise<BlogSitemapResponse> {
  const raw = await cmsFetch("/api/public/blog/sitemap", {
    tags: [BLOG_LIST_TAG],
  });
  return blogSitemapResponseSchema.parse(raw);
}

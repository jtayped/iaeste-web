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

import { env } from "@repo/env/web/server";

/**
 * Client for the narrow, read-only CMS blog API. Server components only. Every
 * response is validated against the shared Zod schema before it reaches a
 * page, requests time out rather than hanging a render, and cache tags let the
 * CMS invalidate published content within seconds.
 */

const TIMEOUT_MS = 4000;
const REVALIDATE_SECONDS = 60;

export const BLOG_LIST_TAG = "blog";
export const blogDocumentTag = (id: string) => `blog:${id}`;

export class CmsUnavailableError extends Error {
  constructor(readonly status: number | "timeout" | "network") {
    super(`CMS unavailable (${status})`);
    this.name = "CmsUnavailableError";
  }
}

type FetchOptions = {
  tags: string[];
  /** Draft preview reads bypass the cache and send the shared secret. */
  preview?: { id: string };
};

async function cmsFetch(path: string, options: FetchOptions): Promise<unknown> {
  const url = `${env.CMS_INTERNAL_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {};
  const next: { revalidate: number | false; tags: string[] } = {
    revalidate: REVALIDATE_SECONDS,
    tags: options.tags,
  };

  if (options.preview) {
    if (!env.CMS_PREVIEW_SECRET) throw new CmsUnavailableError("network");
    headers["x-preview-secret"] = env.CMS_PREVIEW_SECRET;
    next.revalidate = false;
  }

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      next,
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new CmsUnavailableError(response.status);
    return await response.json();
  } catch (error) {
    if (error instanceof CmsUnavailableError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new CmsUnavailableError("timeout");
    }
    throw new CmsUnavailableError("network");
  } finally {
    clearTimeout(timeout);
  }
}

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

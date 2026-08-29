import type { LexicalState } from "@repo/constants/validators/blog";

/**
 * Backend-agnostic blog types. Both readers — `blog-keystatic.ts` (Markdown
 * files) and `blog-payload.ts` (the CMS API) — produce exactly this shape, so
 * page components never branch on `BLOG_SOURCE`.
 */

export const blogLocales = ["ca", "es", "en"] as const;
export const postsPerPage = 6;

export type BlogLocale = (typeof blogLocales)[number];

/** A resolved Markdoc body, as returned by the Keystatic reader thunk. */
export type MarkdocBody = () => Promise<{ node: unknown }>;

export type BlogPost = {
  /** Stable identity: the translation key (Keystatic) or document id (CMS). */
  translationKey: string;
  slug: string;
  locale: BlogLocale;
  requestedLocale: BlogLocale;
  isFallback: boolean;
  draft: boolean;
  title: string;
  excerpt: string;
  author: string;
  publishDate: string;
  tags: string[];
  /** Same-origin URL (Keystatic) or absolute CMS URL (Payload). */
  coverImage: string;
  coverImageMeta: { width: number; height: number } | null;
  /** Exactly one of these is set, depending on the backend. */
  body: MarkdocBody | null;
  bodyLexical: LexicalState | null;
  /**
   * Complete translations of this article. The CMS reader fills this from the
   * detail response; the Keystatic reader leaves it null and callers fall back
   * to `getPostVersions`.
   */
  alternates: BlogPostVersion[] | null;
};

export type BlogPostVersion = {
  locale: BlogLocale;
  slug: string;
};

import type { LexicalState } from "@repo/constants/validators/blog";

/**
 * Blog types produced by the Payload CMS reader (`blog-payload.ts`). Page
 * components import these from `@/lib/blog`.
 */

export const blogLocales = ["ca", "es", "en"] as const;
export const postsPerPage = 6;

export type BlogLocale = (typeof blogLocales)[number];

export type BlogPost = {
  /** Stable identity: the CMS document id. */
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
  /** Absolute CMS media URL. */
  coverImage: string;
  coverImageMeta: { width: number; height: number } | null;
  /** The article body as a Lexical editor state. Null on a list summary. */
  bodyLexical: LexicalState | null;
  /**
   * Complete translations of this article, from the detail response. Null on
   * a list summary; callers then fall back to `getPostVersions`.
   */
  alternates: BlogPostVersion[] | null;
};

export type BlogPostVersion = {
  locale: BlogLocale;
  slug: string;
};

import { env } from "@repo/env/web/server";

import * as keystatic from "./blog-keystatic";
import * as payload from "./blog-payload";

/**
 * Blog reader facade. Page components import from here and keep their call
 * sites; `BLOG_SOURCE` decides whether the data comes from the Keystatic
 * Markdown files or the Payload CMS. `keystatic` is the default and the
 * rollback target during the migration's observation week.
 */

export {
  blogLocales,
  postsPerPage,
  type BlogLocale,
  type BlogPost,
  type BlogPostVersion,
} from "./blog-types";

const impl = env.BLOG_SOURCE === "payload" ? payload : keystatic;

export const getPostsInLocale: typeof keystatic.getPostsInLocale = (
  locale,
  options,
) =>
  env.BLOG_SOURCE === "payload"
    ? payload.getPostsInLocale(locale)
    : keystatic.getPostsInLocale(locale, options);

export const getBlogPosts: typeof keystatic.getBlogPosts = (locale, options) =>
  env.BLOG_SOURCE === "payload"
    ? payload.getBlogPosts(locale)
    : keystatic.getBlogPosts(locale, options);

export const getBlogPost: typeof keystatic.getBlogPost = (
  requestedLocale,
  slug,
  options,
) =>
  env.BLOG_SOURCE === "payload"
    ? payload.getBlogPost(requestedLocale, slug)
    : keystatic.getBlogPost(requestedLocale, slug, options);

export const getPostVersions = impl.getPostVersions;
export const getStaticPostParams = impl.getStaticPostParams;
export const getStaticPaginationParams = impl.getStaticPaginationParams;

/** True when the CMS-backed reader is active (drives `dynamicParams`). */
export const blogIsDynamic = env.BLOG_SOURCE === "payload";

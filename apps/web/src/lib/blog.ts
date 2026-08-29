/**
 * Blog reader facade. Page components import from here so their call sites
 * stay stable; the implementation is the Payload CMS reader in
 * `blog-payload.ts`.
 */

export {
  blogLocales,
  postsPerPage,
  type BlogLocale,
  type BlogPost,
  type BlogPostVersion,
} from "./blog-types";

export {
  getPostsInLocale,
  getBlogPosts,
  getBlogPost,
  getPostVersions,
  getStaticPostParams,
  getStaticPaginationParams,
} from "./blog-payload";

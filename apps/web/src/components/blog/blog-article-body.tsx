import type { BlogPost } from "@/lib/blog";

import { LexicalContent } from "./lexical-content";

/**
 * Renders an article body from the Payload Lexical state the CMS reader
 * produced, inside the shared `blog-prose` container.
 */
export function BlogArticleBody({ post }: { post: BlogPost }) {
  if (post.bodyLexical) {
    return <LexicalContent data={post.bodyLexical} />;
  }

  return null;
}

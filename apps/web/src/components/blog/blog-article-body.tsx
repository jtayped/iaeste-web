import Markdoc from "@markdoc/markdoc";
import React from "react";

import type { BlogPost } from "@/lib/blog";

import { LexicalContent } from "./lexical-content";

/**
 * Renders an article body from whichever backend produced the post: a
 * Payload Lexical state, or the Keystatic Markdoc thunk. Both land in the same
 * `blog-prose` container.
 */
export async function BlogArticleBody({ post }: { post: BlogPost }) {
  if (post.bodyLexical) {
    return <LexicalContent data={post.bodyLexical} />;
  }

  if (post.body) {
    const { node } = await post.body();
    const typedNode = node as Parameters<typeof Markdoc.validate>[0];
    const errors = Markdoc.validate(typedNode);
    if (errors.length > 0) {
      throw new Error(`invalid Markdoc in ${post.slug}`);
    }
    const content = Markdoc.transform(typedNode);
    return (
      <div className="blog-prose">
        {Markdoc.renderers.react(content, React)}
      </div>
    );
  }

  return null;
}

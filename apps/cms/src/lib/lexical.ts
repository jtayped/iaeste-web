import type { Field } from "payload";

import {
  BlockquoteFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
  UploadFeature,
} from "@payloadcms/richtext-lexical";

const UNSAFE_URL = /^\s*(javascript:|vbscript:|data:(?!image\/))/i;

/**
 * The one rich-text configuration for article bodies. Only the structures the
 * public renderer supports are enabled: paragraphs, h2–h4, bold, italic,
 * ordered / unordered lists, links, blockquotes, uploaded images and
 * horizontal rules. No raw HTML, no arbitrary embeds, no custom blocks.
 *
 * The migration script imports this exact editor so converted Markdown lands
 * in an identical node shape.
 */
export const postBodyEditor: ReturnType<typeof lexicalEditor> = lexicalEditor({
  features: [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ["h2", "h3", "h4"] }),
    BoldFeature(),
    ItalicFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    BlockquoteFeature(),
    HorizontalRuleFeature(),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
    LinkFeature({
      // No internal doc linking — articles only link to real URLs.
      enabledCollections: [],
      fields: ({ defaultFields }) =>
        defaultFields.map((field) => {
          if ("name" in field && field.name === "url") {
            return {
              ...field,
              validate: (value: unknown) => {
                if (typeof value === "string" && UNSAFE_URL.test(value)) {
                  return "protocol d'enllaç no permès";
                }
                return true;
              },
            } as Field;
          }
          return field as Field;
        }),
    }),
    UploadFeature({ collections: { media: { fields: [] } } }),
  ],
});

import type { CollectionConfig } from "payload";

import { adminOnly, editorOrAdmin, publishedOrEditor } from "../access/roles";
import {
  rejectDuplicateSlug,
  requireCatalanToPublish,
  slugField,
} from "../hooks/validate-post";
import {
  revalidateOnChange,
  revalidateOnDelete,
} from "../hooks/revalidate-blog";
import { postBodyEditor } from "../lib/lexical";
import { createPreviewToken, type PreviewLocale } from "../lib/signed-preview";

import { env } from "@repo/env/cms/server";

/**
 * One document per article, across all locales. `ca` is the default and
 * fallback locale; publication status belongs to the whole document in v1.
 */
export const Posts: CollectionConfig = {
  slug: "posts",
  labels: { singular: "article", plural: "articles" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "_status", "publishDate", "author"],
    group: "contingut",
    preview: (doc, { locale }) => {
      const id = doc?.id;
      if (!id) return null;
      const previewLocale = (locale ?? "ca") as PreviewLocale;
      const token = createPreviewToken(String(id), previewLocale);
      return `${env.WEB_PUBLIC_ORIGIN}/api/preview/blog/${id}?locale=${previewLocale}&token=${token}`;
    },
  },
  access: {
    read: publishedOrEditor,
    create: editorOrAdmin,
    update: editorOrAdmin,
    // Only administrators may permanently delete an article.
    delete: adminOnly,
  },
  versions: {
    maxPerDoc: 25,
    drafts: {
      autosave: { interval: 2000 },
    },
  },
  hooks: {
    beforeValidate: [rejectDuplicateSlug],
    beforeChange: [requireCatalanToPublish],
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
  },
  fields: [
    {
      name: "title",
      type: "text",
      localized: true,
      label: "títol",
      admin: { description: "obligatori per publicar en català" },
    },
    {
      name: "slug",
      type: "text",
      localized: true,
      index: true,
      label: "slug",
      admin: {
        position: "sidebar",
        description:
          "minúscules, xifres i guionets; es bloqueja després de la primera publicació",
      },
      hooks: { beforeValidate: [slugField] },
    },
    {
      name: "excerpt",
      type: "textarea",
      localized: true,
      maxLength: 240,
      label: "resum",
      admin: {
        description: "obligatori per publicar en català, màxim 240 caràcters",
      },
    },
    {
      name: "body",
      type: "richText",
      localized: true,
      label: "contingut",
      editor: postBodyEditor,
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
      localized: true,
      label: "imatge de portada",
      admin: {
        description:
          "obligatòria per publicar en català; les altres llengües hi recorren",
      },
    },
    {
      name: "tags",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
      label: "etiquetes",
    },
    {
      name: "author",
      type: "text",
      required: true,
      defaultValue: "iaeste lc lleida",
      label: "autoria",
    },
    {
      name: "publishDate",
      type: "date",
      label: "data de publicació",
      admin: {
        position: "sidebar",
        description: "es fixa a la primera publicació si no se n'indica cap",
      },
      hooks: {
        beforeChange: [
          ({ value, data, originalDoc }) => {
            if (value) return value;
            const publishing =
              data?._status === "published" &&
              originalDoc?._status !== "published";
            return publishing ? new Date().toISOString() : value;
          },
        ],
      },
    },
    {
      name: "legacyTranslationKey",
      type: "text",
      unique: true,
      label: "clau de traducció heretada",
      admin: {
        hidden: true,
        readOnly: true,
        description: "només l'utilitza el script de migració",
      },
    },
  ],
};

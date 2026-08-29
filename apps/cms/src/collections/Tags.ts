import type { CollectionConfig } from "payload";

import { adminOnly, editorOrAdmin, publicRead } from "../access/roles";
import { slugify } from "../lib/slug";

/**
 * Shared classification for posts. `key` is a stable, non-localized identifier
 * (editors pick from existing tags rather than retyping variants); `label` is
 * the display name per locale, falling back to Catalan when a locale is blank.
 */
export const Tags: CollectionConfig = {
  slug: "tags",
  labels: { singular: "etiqueta", plural: "etiquetes" },
  admin: {
    useAsTitle: "key",
    defaultColumns: ["key", "label"],
    group: "contingut",
  },
  access: {
    read: publicRead,
    create: editorOrAdmin,
    update: editorOrAdmin,
    delete: adminOnly,
  },
  fields: [
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      label: "clau",
      admin: { description: "identificador estable en minúscules, únic" },
      hooks: {
        beforeValidate: [
          ({ value, data }) =>
            typeof value === "string" && value.length > 0
              ? slugify(value)
              : typeof data?.label === "string"
                ? slugify(data.label)
                : value,
        ],
      },
    },
    {
      name: "label",
      type: "text",
      required: true,
      localized: true,
      label: "nom",
    },
  ],
};

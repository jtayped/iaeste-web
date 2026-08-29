import type { CollectionConfig } from "payload";

import { env } from "@repo/env/cms/server";

import { editorOrAdmin, isAdmin, publicRead } from "../access/roles";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Uploaded images. Metadata in Postgres, bytes under `CMS_MEDIA_DIR` (a
 * persistent Coolify volume in production). Only editors upload; deletion is
 * blocked while a post still references the file unless an administrator
 * overrides it.
 */
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "fitxer", plural: "media" },
  admin: { group: "contingut" },
  access: {
    read: publicRead,
    create: editorOrAdmin,
    update: editorOrAdmin,
    delete: editorOrAdmin,
  },
  upload: {
    staticDir: env.CMS_MEDIA_DIR,
    mimeTypes: ACCEPTED,
    // No fetch-by-URL in v1.
    pasteURL: false,
    adminThumbnail: "card",
    focalPoint: true,
    crop: true,
    imageSizes: [
      {
        name: "card",
        width: 800,
        height: 450,
        withoutEnlargement: true,
        formatOptions: { format: "webp", options: { quality: 78 } },
      },
      {
        name: "hero",
        width: 1600,
        height: 900,
        withoutEnlargement: true,
        formatOptions: { format: "webp", options: { quality: 80 } },
      },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      localized: true,
      label: "text alternatiu",
      admin: {
        description:
          "obligatori abans que una imatge s'utilitzi en un article publicat",
      },
    },
    {
      name: "caption",
      type: "text",
      localized: true,
      label: "peu de foto",
    },
    {
      name: "sourceNote",
      type: "text",
      label: "procedència o llicència",
    },
  ],
  hooks: {
    beforeValidate: [
      ({ req }) => {
        const size = req.file?.size;
        if (typeof size === "number" && size > MAX_BYTES) {
          throw new Error(
            `el fitxer supera el màxim de ${MAX_BYTES / (1024 * 1024)} MB`,
          );
        }
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        if (isAdmin(req.user) && req.query?.force === "true") return;

        const referencing = await req.payload.find({
          collection: "posts",
          where: { coverImage: { equals: id } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        });

        if (referencing.totalDocs > 0) {
          throw new Error(
            "aquest fitxer s'utilitza en un article; elimina la referència primer",
          );
        }
      },
    ],
  },
};

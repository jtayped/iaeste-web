import type {
  CollectionBeforeChangeHook,
  CollectionConfig,
  DateFieldValidation,
} from "payload";
import { APIError } from "payload";
import { date } from "payload/shared";

import { env } from "@repo/env/cms/server";

import { adminOnly, editorOrAdmin, publishedOrEditor } from "../access/roles";
import { countryField } from "../fields/country";
import { publishDateField } from "../fields/publish-date";
import { localizedSlugField } from "../fields/slug";
import { revalidateOnChange, revalidateOnDelete } from "../hooks/revalidate";
import {
  rejectDuplicateSlug,
  requireCatalanToPublish,
} from "../hooks/validate-document";
import { postBodyEditor } from "../lib/lexical";
import { createPreviewToken, type PreviewLocale } from "../lib/signed-preview";

/**
 * A story is only published with the person's written permission on file.
 * The site must never show an invented or unapproved testimonial.
 */
const requireConsentToPublish: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
}) => {
  if (data?._status !== "published") return data;
  const consent = data?.consent ?? originalDoc?.consent;
  if (consent !== true) {
    throw new APIError(
      "no es pot publicar sense confirmar que la persona ha donat el seu permís per escrit",
      400,
    );
  }
  return data;
};

/** Payload's own date check, then the end must not come before the start. */
const endsAfterStart: DateFieldValidation = (value, options) => {
  const valid = date(value, options);
  if (valid !== true) return valid;

  const start = (options.siblingData as { startDate?: unknown }).startDate;
  if (!value || !start) return true;
  const end = new Date(value).getTime();
  const begin = new Date(start as string | Date).getTime();
  return end >= begin || "el final no pot ser anterior a l'inici";
};

const monthPicker = {
  date: { pickerAppearance: "monthOnly", displayFormat: "MM/yyyy" },
} as const;

/**
 * First-person stories from UdL students who did an IAESTE placement abroad.
 * One document per story, across all locales; `ca` is the default and
 * fallback locale, as for posts.
 */
export const Experiences: CollectionConfig = {
  slug: "experiences",
  labels: { singular: "experiència", plural: "experiències" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "studentName", "country", "_status", "featured"],
    group: "contingut",
    description:
      "estades a l'estranger explicades per qui les ha viscut. només històries reals i amb permís.",
    preview: (doc, { locale }) => {
      const id = doc?.id;
      if (!id) return null;
      const previewLocale = (locale ?? "ca") as PreviewLocale;
      const token = createPreviewToken(
        "experiences",
        String(id),
        previewLocale,
      );
      return `${env.WEB_PUBLIC_ORIGIN}/api/preview/experiences/${id}?locale=${previewLocale}&token=${token}`;
    },
  },
  access: {
    read: publishedOrEditor,
    create: editorOrAdmin,
    update: editorOrAdmin,
    delete: adminOnly,
  },
  versions: {
    maxPerDoc: 25,
    drafts: {
      autosave: { interval: 2000 },
    },
  },
  hooks: {
    beforeValidate: [rejectDuplicateSlug("una experiència")],
    beforeChange: [
      requireConsentToPublish,
      requireCatalanToPublish({
        title: "títol",
        slug: "slug",
        quote: "cita",
        body: "text",
        photo: "foto",
        studentName: "nom",
        country: "país",
      }),
    ],
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
  },
  fields: [
    {
      name: "title",
      type: "text",
      localized: true,
      label: "títol",
      admin: {
        placeholder: "sis mesos dissenyant turbines a munic",
        description: "obligatori per publicar en català",
      },
    },
    localizedSlugField(),
    publishDateField(),
    {
      name: "featured",
      type: "checkbox",
      label: "destaca a la pàgina d'estudiants",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "consent",
      type: "checkbox",
      label: "tenim el seu permís per escrit",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "obligatori per publicar: la persona ha acceptat que es publiquin el seu nom, la seva foto i el seu text",
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "persona i estada",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "studentName",
                  type: "text",
                  label: "nom",
                  admin: {
                    width: "50%",
                    description:
                      "nom i, si vol, inicial del cognom. obligatori per publicar",
                  },
                },
                {
                  name: "degree",
                  type: "text",
                  label: "estudis",
                  localized: true,
                  admin: {
                    width: "50%",
                    placeholder: "grau en enginyeria mecànica",
                  },
                },
              ],
            },
            {
              name: "role",
              type: "text",
              label: "què hi va fer",
              localized: true,
              admin: {
                placeholder:
                  "pràctiques de sis mesos en un laboratori de materials",
                description:
                  "en poques paraules. es mostra sota el nom; si és buit, es mostren els estudis",
              },
            },
            {
              type: "row",
              fields: [
                countryField({
                  admin: {
                    width: "33%",
                    description: "obligatori per publicar",
                  },
                }),
                {
                  name: "city",
                  type: "text",
                  label: "ciutat",
                  localized: true,
                  admin: { width: "33%" },
                },
                {
                  name: "hostCompany",
                  type: "text",
                  label: "empresa o institució",
                  admin: { width: "33%" },
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "startDate",
                  type: "date",
                  label: "inici",
                  admin: { width: "50%", ...monthPicker },
                },
                {
                  name: "endDate",
                  type: "date",
                  label: "final",
                  admin: { width: "50%", ...monthPicker },
                  validate: endsAfterStart,
                },
              ],
            },
          ],
        },
        {
          label: "història",
          fields: [
            {
              name: "quote",
              type: "textarea",
              label: "cita destacada",
              localized: true,
              maxLength: 240,
              admin: {
                description:
                  "una frase seva, literal. es mostra a les targetes. obligatòria per publicar en català, màxim 240 caràcters",
              },
            },
            {
              name: "photo",
              type: "upload",
              relationTo: "media",
              label: "foto principal",
              admin: { description: "obligatòria per publicar" },
            },
            {
              name: "gallery",
              type: "upload",
              relationTo: "media",
              hasMany: true,
              maxRows: 12,
              label: "més fotos",
            },
            {
              name: "body",
              type: "richText",
              localized: true,
              label: "text",
              editor: postBodyEditor,
              admin: { description: "obligatori per publicar en català" },
            },
          ],
        },
      ],
    },
  ],
};

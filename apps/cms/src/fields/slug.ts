import type { TextField } from "payload";

import { slugField } from "../hooks/validate-document";

/**
 * The localized `slug` of a publishable document. Generated from the title,
 * editable until first publication, then locked by the `slugField` hook.
 */
export function localizedSlugField(): TextField {
  return {
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
  };
}

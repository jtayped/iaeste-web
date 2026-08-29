import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  FieldHook,
} from "payload";
import { APIError } from "payload";

import { isValidSlug, slugify } from "../lib/slug";

const CATALAN = "ca";

/**
 * Field hook on `slug`. Fills an empty slug from the sibling `title` when a
 * locale is first written, and enforces the post-publication lock: once the
 * document has been published, the stored slug for that locale cannot change.
 * The lock lives here, on the server, not only in a read-only admin input.
 */
export const slugField: FieldHook = ({ value, originalDoc, data, req }) => {
  const previous = originalDoc?.slug;
  const published =
    originalDoc?._status === "published" || data?._status === "published";

  if (published && previous && value !== previous) {
    throw new APIError(
      `el slug (${req.locale ?? "?"}) està bloquejat des de la primera publicació`,
      400,
    );
  }

  const candidate =
    typeof value === "string" && value.trim().length > 0
      ? value
      : typeof data?.title === "string"
        ? slugify(data.title)
        : value;

  if (
    typeof candidate === "string" &&
    candidate.length > 0 &&
    !isValidSlug(candidate)
  ) {
    throw new APIError(
      "el slug només pot contenir minúscules, xifres i guionets",
      400,
    );
  }

  return candidate;
};

/**
 * Collection hook. Rejects a duplicate localized slug with a clear message
 * instead of letting Postgres surface a raw unique-constraint error, and
 * never resolves the collision by appending a number.
 */
export const rejectDuplicateSlug: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  const slug = data?.slug;
  if (!slug || typeof slug !== "string") return data;

  const existing = await req.payload.find({
    collection: "posts",
    locale: (req.locale as "ca" | "es" | "en") ?? CATALAN,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  const clash = existing.docs.find(
    (doc) => operation === "create" || doc.id !== originalDoc?.id,
  );

  if (clash) {
    throw new APIError(
      `ja hi ha un article amb el slug "${slug}" en aquesta llengua`,
      400,
    );
  }

  return data;
};

const REQUIRED_TO_PUBLISH = [
  "title",
  "slug",
  "excerpt",
  "body",
  "coverImage",
] as const;

const FIELD_LABELS: Record<(typeof REQUIRED_TO_PUBLISH)[number], string> = {
  title: "títol",
  slug: "slug",
  excerpt: "resum",
  body: "contingut",
  coverImage: "imatge de portada",
};

/**
 * Collection hook. Draft autosaves may be incomplete, but publishing is
 * strict: an article can only be published when its Catalan locale carries a
 * complete set of fields. Missing Spanish or English is fine — the public
 * site falls back to Catalan.
 */
export const requireCatalanToPublish: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
}) => {
  if (data?._status !== "published") return data;

  // Whichever locale this write targets, validate the Catalan content: fetch
  // it explicitly rather than trusting the in-flight `data`, which only holds
  // the current request's locale.
  const catalan =
    req.locale === CATALAN
      ? { ...originalDoc, ...data }
      : originalDoc?.id
        ? await req.payload.findByID({
            collection: "posts",
            id: originalDoc.id,
            locale: CATALAN,
            depth: 0,
            overrideAccess: true,
            draft: true,
            req,
          })
        : data;

  const missing = REQUIRED_TO_PUBLISH.filter((field) => {
    const v = (catalan as Record<string, unknown>)?.[field];
    if (v == null) return true;
    if (typeof v === "string") return v.trim().length === 0;
    return false;
  });

  if (missing.length > 0) {
    throw new APIError(
      `no es pot publicar: falten camps en català (${missing
        .map((field) => FIELD_LABELS[field])
        .join(", ")})`,
      400,
    );
  }

  return data;
};

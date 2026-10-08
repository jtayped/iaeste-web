import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionSlug,
  FieldHook,
  PayloadRequest,
} from "payload";
import { APIError } from "payload";

import { isValidSlug, slugify } from "../lib/slug";

const CATALAN = "ca";

/**
 * Runs a Local API read that shares `req` (and so its transaction). Payload
 * sets `req.locale` and `req.fallbackLocale` on any `req` it is given, and the
 * rest of the save reads them to pick the locale it writes and the fallback
 * it returns. Restoring both keeps a publish from es or en from overwriting
 * the Catalan fields.
 */
async function keepingRequestLocale<T>(
  req: PayloadRequest,
  read: () => Promise<T>,
): Promise<T> {
  const { locale, fallbackLocale } = req;
  try {
    return await read();
  } finally {
    req.locale = locale;
    req.fallbackLocale = fallbackLocale;
  }
}

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
 * never resolves the collision by appending a number. `noun` names the
 * document in the message, with its article: "un article", "una experiència".
 */
export const rejectDuplicateSlug =
  (noun: string): CollectionBeforeValidateHook =>
  async ({ data, originalDoc, req, operation, collection }) => {
    const slug = data?.slug;
    if (!slug || typeof slug !== "string") return data;

    const existing = await keepingRequestLocale(req, () =>
      req.payload.find({
        collection: collection.slug as CollectionSlug,
        locale: (req.locale as "ca" | "es" | "en") ?? CATALAN,
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      }),
    );

    const clash = existing.docs.find(
      (doc) => operation === "create" || doc.id !== originalDoc?.id,
    );

    if (clash) {
      throw new APIError(
        `ja hi ha ${noun} amb el slug "${slug}" en aquesta llengua`,
        400,
      );
    }

    return data;
  };

/**
 * Collection hook. Draft autosaves may be incomplete, but publishing is
 * strict: a document can only be published when its Catalan locale carries
 * every field in `required`, a map of field name to the label the error
 * shows. Missing Spanish or English is fine, since the public site falls
 * back to Catalan. Non-localized fields are checked the same way.
 */
export const requireCatalanToPublish =
  (required: Record<string, string>): CollectionBeforeChangeHook =>
  async ({ data, req, originalDoc, collection }) => {
    if (data?._status !== "published") return data;

    // Whichever locale this write targets, validate the Catalan content:
    // fetch it explicitly rather than trusting the in-flight `data`, which
    // only holds the current request's locale.
    let catalan: unknown = data;
    if (req.locale === CATALAN) {
      catalan = { ...originalDoc, ...data };
    } else if (originalDoc?.id) {
      catalan = await keepingRequestLocale(req, () =>
        req.payload.findByID({
          collection: collection.slug as CollectionSlug,
          id: originalDoc.id,
          locale: CATALAN,
          depth: 0,
          overrideAccess: true,
          draft: true,
          req,
        }),
      );
    }

    const missing = Object.keys(required).filter((field) => {
      const v = (catalan as Record<string, unknown>)?.[field];
      if (v == null) return true;
      if (typeof v === "string") return v.trim().length === 0;
      return false;
    });

    if (missing.length > 0) {
      throw new APIError(
        `no es pot publicar: falten camps en català (${missing
          .map((field) => required[field])
          .join(", ")})`,
        400,
      );
    }

    return data;
  };

/**
 * Slug helpers shared by the Posts collection hooks and the migration script.
 * Policy (see `apps/cms/AGENTS.md`): a slug is lowercase `a-z0-9-`, generated
 * from the localized title on first creation, editable until the locale is
 * first published, then locked by a server hook. Collisions are a field
 * error, never silently suffixed.
 */

const DIACRITICS = /[̀-ͯ]/g;
const NON_SLUG = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /(^-+)|(-+$)/g;

/** Deterministic slugify. Catalan `l·l` collapses to `ll`, `ñ` to `n`, etc. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .replace(/[·・]/g, "")
    .toLowerCase()
    .replace(NON_SLUG, "-")
    .replace(EDGE_HYPHENS, "")
    .slice(0, 96);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_PATTERN.test(value);
}

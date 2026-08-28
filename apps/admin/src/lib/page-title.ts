import type { Metadata } from "next";

/**
 * One breadcrumb entry, root-first and *without* the `panell` root — the shell
 * prepends that. The last entry carries no `href` and renders as the current
 * page. A dynamic leaf (a person's name, a campaign label) is just a `label`
 * built from the record the page already loaded.
 */
export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

/** The root crumb and the document-title prefix. Both, so they cannot drift. */
export const TITLE_ROOT = "panell";

const SEPARATOR = " · ";

/**
 * Builds the full document title: `panell · <trail>`.
 *
 * A trail that already starts with `panell` (the dashboard, whose title *is*
 * the root) is not prefixed twice — `adminTitle("panell")` is `"panell"`, not
 * `"panell · panell"`.
 */
export function adminTitle(trail: string | string[]): string {
  const parts = (Array.isArray(trail) ? trail : [trail]).filter(
    (part) => part.length > 0,
  );
  const rest = parts[0] === TITLE_ROOT ? parts.slice(1) : parts;
  return [TITLE_ROOT, ...rest].join(SEPARATOR);
}

/**
 * The title trail for a page, derived from exactly what `<PageShell>` renders:
 * the breadcrumb labels, plus the visible title when it says something the
 * last crumb does not.
 *
 * Deriving it rather than passing it separately is what keeps the tab, the
 * server `<title>`, and the on-page header in agreement.
 */
export function pageTrail(
  breadcrumb: readonly BreadcrumbEntry[],
  title: string,
): string[] {
  const labels = breadcrumb.map((entry) => entry.label);
  const last = labels[labels.length - 1];
  return last === title ? labels : [...labels, title];
}

/**
 * The `metadata` export for a page, built from the same two values it passes
 * to `<PageShell>`.
 *
 * `absolute` on purpose: the root layout sets a `panell · %s` template for any
 * route that forgets to export metadata, and `adminTitle` already applies that
 * prefix itself. Letting the template run over it would produce
 * `panell · panell · membres`.
 */
export function adminMetadata(
  breadcrumb: readonly BreadcrumbEntry[],
  title: string,
  description?: string,
): Metadata {
  return {
    title: { absolute: adminTitle(pageTrail(breadcrumb, title)) },
    ...(description === undefined ? {} : { description }),
  };
}

import { DocumentTitle } from "@/components/shell/document-title";
import { ResponsiveBreadcrumbs } from "@/components/shell/responsive-breadcrumbs";
import { adminTitle, pageTrail, type BreadcrumbEntry } from "@/lib/page-title";

export type { BreadcrumbEntry };

/**
 * The content column every page and the route-level skeleton share, so the
 * layout does not shift when the real page replaces `loading.tsx`.
 *
 * Mobile first: one column with 16px gutters from 360px, widening to the
 * app's established `max-w-6xl` measure on `lg`.
 */
export const PAGE_CONTAINER_CLASS =
  "mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8";

export interface PageShellProps {
  /**
   * Root-first, *without* the `dashboard` root — the shell prepends it. The last
   * entry needs no `href`; it renders as the current page. Omit entirely on
   * the dashboard, whose only crumb is the root.
   */
  breadcrumb?: readonly BreadcrumbEntry[];
  /** Lowercase Catalan for a fixed page; the record's own name for a leaf. */
  title: string;
  description?: string;
  /** Right-aligned on `sm+`, stacked under the title on a phone. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * The single frame every admin page renders through.
 *
 * It owns the three things that used to be spread across a path-derived
 * breadcrumb in the header, a `PageHeader` component, and one global
 * `metadata.title`: the crumb trail, the visible header, and the tab title.
 * Because they are all derived from the same two props here, a page cannot be
 * called one thing in the breadcrumb and another in the tab.
 *
 * The breadcrumb stays at the top of the content column on mobile. On `md+`,
 * `ResponsiveBreadcrumbs` portals the page-owned trail into the app header,
 * next to the sidebar control. This keeps dynamic record names authoritative
 * without asking the parent layout to fetch each page's data again.
 */
export function PageShell({
  breadcrumb = [],
  title,
  description,
  actions,
  children,
}: PageShellProps) {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <DocumentTitle title={adminTitle(pageTrail(breadcrumb, title))} />

      <div className="space-y-6 md:space-y-8">
        <div>
          <ResponsiveBreadcrumbs entries={breadcrumb} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1">
              <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? (
              // Full-height taps on a phone; back to the compact control size
              // once there is a pointer.
              <div className="flex flex-wrap items-center gap-2 [&>*]:min-h-11 sm:[&>*]:min-h-9">
                {actions}
              </div>
            ) : null}
          </div>
        </div>

        {children ? (
          <div className="space-y-6 md:space-y-8">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

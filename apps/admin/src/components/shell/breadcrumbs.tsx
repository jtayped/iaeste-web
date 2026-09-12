import { Breadcrumb, BreadcrumbItem } from "@repo/ui/breadcrumb";
import { cn } from "@repo/ui/lib/utils";

import { TITLE_ROOT, type BreadcrumbEntry } from "@/lib/page-title";

/**
 * Pure renderer. It has no idea what page it is on — `<PageShell>` hands it the
 * entries, because only the page has the loaded record a dynamic leaf needs.
 * The previous path-derived version could only ever say "detall".
 *
 * The `dashboard` root is prepended here rather than repeated in every page's
 * `breadcrumb` prop, and it links to `/` — except when it is the only crumb,
 * where it is the current page and React Aria renders it unlinked.
 *
 * The same rule is why a trailing `entry.href` is harmless: the last crumb is
 * the page you are on, and React Aria never links it.
 *
 * The leaf truncates rather than pushing the header sideways. It takes both
 * halves: `.breadcrumbs__item[data-current]` in `globals.css` lets the item
 * shrink (every crumb is `shrink-0` otherwise), and the label is wrapped in a
 * block of its own here — the crumb's link is a flex container, and an
 * ellipsis is never drawn for the anonymous box a bare text child becomes
 * inside one, which is why a long name used to clip mid-letter.
 */
export function Breadcrumbs({
  entries,
  className,
}: {
  entries: readonly BreadcrumbEntry[];
  className?: string;
}) {
  return (
    <Breadcrumb className={cn("flex-nowrap gap-1.5 sm:flex-wrap", className)}>
      <BreadcrumbItem href="/">{TITLE_ROOT}</BreadcrumbItem>
      {entries.map((entry, index) => (
        <BreadcrumbItem key={`${entry.label}-${index}`} href={entry.href}>
          <span className="block truncate" title={entry.label}>
            {entry.label}
          </span>
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}

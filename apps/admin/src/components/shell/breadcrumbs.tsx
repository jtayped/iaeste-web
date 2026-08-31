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
 * At 360px the trail wraps and the leaf truncates rather than pushing the
 * header sideways: a long leaf like a full name ellipsizes instead of
 * overflowing the viewport. See `.breadcrumbs__item[data-current]` in
 * `globals.css` — the item is `shrink-0` by default, which would otherwise
 * defeat the truncation.
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
          {entry.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}

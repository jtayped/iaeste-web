import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/ui/breadcrumb";

import { TITLE_ROOT, type BreadcrumbEntry } from "@/lib/page-title";

/**
 * Pure renderer. It has no idea what page it is on — `<PageShell>` hands it the
 * entries, because only the page has the loaded record a dynamic leaf needs.
 * The previous path-derived version could only ever say "detall".
 *
 * The `panell` root is prepended here rather than repeated in every page's
 * `breadcrumb` prop, and it links to `/` unless it *is* the current page.
 *
 * At 360px the trail wraps (`BreadcrumbList` is `flex-wrap`) and each label
 * truncates rather than pushing the header sideways: a long leaf like a full
 * name ellipsizes instead of overflowing the viewport.
 */
export function Breadcrumbs({
  entries,
}: {
  entries: readonly BreadcrumbEntry[];
}) {
  const rootIsCurrent = entries.length === 0;

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap gap-1.5 sm:flex-wrap">
        <BreadcrumbItem className="shrink-0">
          {rootIsCurrent ? (
            <BreadcrumbPage>{TITLE_ROOT}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/">{TITLE_ROOT}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {entries.map((entry, index) => (
          <BreadcrumbCrumb
            key={`${entry.label}-${index}`}
            entry={entry}
            isLast={index === entries.length - 1}
          />
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function BreadcrumbCrumb({
  entry,
  isLast,
}: {
  entry: BreadcrumbEntry;
  isLast: boolean;
}) {
  // A trailing `href` would render a link to the page you are already on.
  const asLink = entry.href !== undefined && !isLast;

  return (
    <>
      <BreadcrumbSeparator className="shrink-0" />
      <BreadcrumbItem className={isLast ? "min-w-0" : "shrink-0"}>
        {asLink ? (
          <BreadcrumbLink asChild>
            <Link href={entry.href ?? "/"}>{entry.label}</Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage className="truncate">{entry.label}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
    </>
  );
}

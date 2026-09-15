"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";

import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { TITLE_ROOT, type BreadcrumbEntry } from "@/lib/page-title";

/**
 * What the page-owned trail turns into at each width.
 *
 * On `md+` it is a breadcrumb, portalled into the app header: the header
 * belongs to the parent layout while a dynamic leaf belongs to the page that
 * fetched the record, and a portal is what lets the label stay with the page.
 *
 * Below `md` it is a back link to the parent instead. The trail used to be
 * stacked in the content column directly above the `<h1>`, where its leaf said
 * the same thing the heading was about to — on the dashboard, literally
 * `dashboard` above `dashboard` — so every page opened with two lines that
 * told you nothing. The one part of a trail a phone actually needs is the way
 * out of a detail page.
 *
 * The same duplication is why a trail of one crumb is suppressed on the
 * desktop too: a lone `dashboard` crumb over a `dashboard` heading is not a
 * trail, it is an echo.
 */
export function ResponsiveBreadcrumbs({
  entries,
  title,
}: {
  entries: readonly BreadcrumbEntry[];
  title: string;
}) {
  const [desktopTarget, setDesktopTarget] = React.useState<HTMLElement | null>(
    null,
  );

  React.useEffect(() => {
    setDesktopTarget(
      document.querySelector<HTMLElement>("[data-desktop-breadcrumbs]"),
    );
  }, []);

  const parent = parentCrumb(entries);
  const echoesTitle =
    entries.length === 0 && title.trim().toLowerCase() === TITLE_ROOT;

  return (
    <>
      {parent ? (
        <div className="mb-4 md:hidden">
          <Link
            href={parent.href}
            className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded px-1 text-sm text-muted-foreground ring-ring outline-none hover:text-foreground focus-visible:ring-2"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{parent.label}</span>
          </Link>
        </div>
      ) : null}
      {desktopTarget && !echoesTitle
        ? createPortal(
            <Breadcrumbs entries={entries} className="sm:flex-nowrap" />,
            desktopTarget,
          )
        : null}
    </>
  );
}

/**
 * The crumb one level up: the trail's second-to-last entry, or the dashboard
 * root for a first-level page. The leaf itself is never it — that is the page
 * you are already on.
 */
function parentCrumb(
  entries: readonly BreadcrumbEntry[],
): { label: string; href: string } | null {
  if (entries.length === 0) return null;

  const parent = entries[entries.length - 2];
  if (parent?.href) return { label: parent.label, href: parent.href };
  return { label: TITLE_ROOT, href: "/" };
}

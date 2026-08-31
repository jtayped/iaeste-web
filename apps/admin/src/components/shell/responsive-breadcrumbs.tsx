"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import type { BreadcrumbEntry } from "@/lib/page-title";

/**
 * Keeps the breadcrumb with the page on mobile and moves the same renderer
 * into the stable app header on desktop.
 *
 * A portal is necessary because the header belongs to the parent layout while
 * dynamic breadcrumb labels belong to the page that fetched the record. The
 * mobile copy is server-rendered in place; the desktop copy mounts into the
 * header after hydration and updates with each client navigation.
 */
export function ResponsiveBreadcrumbs({
  entries,
}: {
  entries: readonly BreadcrumbEntry[];
}) {
  const [desktopTarget, setDesktopTarget] = React.useState<HTMLElement | null>(
    null,
  );

  React.useEffect(() => {
    setDesktopTarget(
      document.querySelector<HTMLElement>("[data-desktop-breadcrumbs]"),
    );
  }, []);

  return (
    <>
      <div className="mb-4 md:hidden">
        <Breadcrumbs entries={entries} />
      </div>
      {desktopTarget
        ? createPortal(
            <Breadcrumbs entries={entries} className="sm:flex-nowrap" />,
            desktopTarget,
          )
        : null}
    </>
  );
}

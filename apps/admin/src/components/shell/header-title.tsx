"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** How far the heading has to slide before the header takes over: the header. */
const HEADER_HEIGHT = 56;

/** Frames to keep looking for the heading a client navigation is about to mount. */
const LOOKUP_FRAMES = 30;

/**
 * What the sticky phone header says.
 *
 * The org name, until the page's own `<h1>` has scrolled up under the header —
 * then the page's title, because ten rows into membres the one thing the top
 * bar was still saying ("iaeste lleida") is the one thing you already knew.
 * The heading is found by `data-page-title`, which `<PageShell>` puts on every
 * page's `<h1>`.
 */
export function HeaderTitle({ fallback }: { fallback: string }) {
  const pathname = usePathname();
  const [pageTitle, setPageTitle] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPageTitle(null);

    let frame = 0;
    let attempts = 0;
    let observer: IntersectionObserver | null = null;

    // On a client navigation this effect runs before the new page's heading is
    // in the DOM, so the lookup waits for it — for a bounded number of frames,
    // since a page that renders no heading never gets one.
    const attach = () => {
      const heading = document.querySelector<HTMLElement>("[data-page-title]");

      if (heading === null) {
        if (attempts++ >= LOOKUP_FRAMES) return;
        frame = requestAnimationFrame(attach);
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry === undefined) return;
          setPageTitle(
            entry.isIntersecting ? null : (heading.textContent?.trim() ?? null),
          );
        },
        { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px` },
      );
      observer.observe(heading);
    };

    attach();

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [pathname]);

  if (pageTitle !== null) {
    return (
      <span className="truncate px-1 text-sm font-semibold tracking-tight">
        {pageTitle}
      </span>
    );
  }

  return (
    <Link
      href="/"
      className="truncate rounded-md px-1 text-sm font-semibold tracking-tight ring-ring outline-none focus-visible:ring-2"
    >
      {fallback}
    </Link>
  );
}

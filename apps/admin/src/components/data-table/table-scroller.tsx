"use client";

import * as React from "react";

/**
 * The wrapper a `<DataTable>` scrolls sideways inside.
 *
 * Two things it has to get right, and both were broken at 390px. The scroll
 * has to be *contained*: `overflow-x-auto` on a box that the table can still
 * stretch is not a scroller, it is a clipper — which is how the last column
 * came out as `pe` mid-word and a row of buttons as a white sliver. `min-w-0`
 * plus a `w-full` box is what makes the wrapper the one that gives way rather
 * than the page.
 *
 * And it has to *say* there is more to the right. A table cut off at the
 * viewport edge looks like a table that ends there, so a fade appears on
 * whichever side has content out of view, and disappears when you reach it.
 * The region is focusable because a scroll container that only a pointer can
 * reach is not reachable at all.
 *
 * The border and the rounding belong to the region `<DataTable>` draws around
 * every state of a list, not here: this one only ever holds the full one.
 */
export function TableScroller({
  label,
  busy,
  children,
}: {
  label: string;
  busy: boolean;
  children: React.ReactNode;
}) {
  const viewport = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ start: false, end: false });

  const measure = React.useCallback(() => {
    const node = viewport.current;
    if (node === null) return;

    const remaining = node.scrollWidth - node.clientWidth - node.scrollLeft;
    setEdges((previous) => {
      const next = { start: node.scrollLeft > 1, end: remaining > 1 };
      return previous.start === next.start && previous.end === next.end
        ? previous
        : next;
    });
  }, []);

  React.useEffect(() => {
    measure();

    const node = viewport.current;
    if (node === null || typeof ResizeObserver === "undefined") return;

    // The table itself is observed as well as the viewport: a narrower window
    // is one way the overflow appears, a page of longer names is the other.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);

    return () => {
      observer.disconnect();
    };
  }, [measure, children]);

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={viewport}
        onScroll={measure}
        tabIndex={0}
        role="region"
        aria-label={label}
        aria-busy={busy}
        className="w-full min-w-0 overflow-x-auto ring-ring outline-none ring-inset focus-visible:ring-2"
      >
        {children}
      </div>

      {edges.start ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent"
        />
      ) : null}
      {edges.end ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent"
        />
      ) : null}
    </div>
  );
}

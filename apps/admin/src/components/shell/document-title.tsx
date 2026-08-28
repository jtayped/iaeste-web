"use client";

import * as React from "react";

/**
 * Keeps `document.title` equal to what `<PageShell>` renders.
 *
 * The page's own `metadata` / `generateMetadata` export already puts the right
 * string in the server HTML, so this is not what makes the first paint correct
 * — it is the backstop for the case the two can diverge: a leaf whose label
 * comes from data the metadata pass approximated (or has yet to wire up).
 *
 * It renders nothing and runs in an effect, so it can never cause a hydration
 * mismatch.
 */
export function DocumentTitle({ title }: { title: string }) {
  React.useEffect(() => {
    if (document.title !== title) document.title = title;
  }, [title]);

  return null;
}

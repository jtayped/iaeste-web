"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RouterProvider as HeroUIRouterProvider } from "@heroui/react/rac";

/**
 * Teaches React Aria how to navigate.
 *
 * HeroUI's `Breadcrumbs.Item`, `Dropdown.Item` and `Link` all take an `href`
 * and render a real `<a>`. Left alone, pressing one is a full document load —
 * the app shell, the session fetch and every layout re-run — where the old
 * `asChild` + `next/link` composition did a client transition. React Aria's
 * `RouterProvider` is the supported way back: it hands the press to Next's
 * router instead.
 *
 * It only intercepts presses that a browser would treat as an in-page
 * navigation. Same-origin is required, and `download`, `target`, and the
 * modifier keys that mean "open in a new tab" all fall through to the browser
 * untouched — which is what keeps the members CSV export a real download.
 */
export function RouterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIRouterProvider navigate={router.push}>
      {children}
    </HeroUIRouterProvider>
  );
}

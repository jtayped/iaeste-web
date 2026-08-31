"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { I18nProvider } from "@repo/ui/i18n-provider";
import { RouterProvider } from "@repo/ui/router-provider";

/**
 * TanStack Query, mounted at the root and currently used by nothing.
 *
 * That is deliberate: the dashboard is a plain server-component fetch and does
 * not need caching. The provider is here so the pages that *will* earn it —
 * the review queue and the paginated members table, per the plan's "Data
 * fetching" — can start using `useQuery` without a layout change landing in
 * the same PR as their first mutation.
 *
 * The client lives in state, not at module scope: a module-level client is
 * shared across every request the server process handles, which on the server
 * leaks one user's cached data into another's render.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Admin data changes when a human clicks something, not on a
            // timer, so refetching on every window focus is mostly noise.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* The panel is Catalan-only, so React Aria's own widgets are too —
          without this the date picker's calendar formats itself in whatever
          language the browser happens to prefer. */}
      <I18nProvider locale="ca-ES">
        <RouterProvider>{children}</RouterProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

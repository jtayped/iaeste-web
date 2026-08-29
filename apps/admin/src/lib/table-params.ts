"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The URL is the source of truth for every list screen's query.
 *
 * Search text, filters and the page number all live in `?q=&status=&page=`,
 * and each change rewrites the URL, which re-renders the page, which refetches
 * from the API. Nothing is ever filtered over rows already in memory — see the
 * "Tables" section of `apps/admin/AGENTS.md`.
 *
 * `router.replace` rather than `push`: paging through a list should not build
 * a twelve-entry history that the back button has to walk out of. `scroll:
 * false` keeps the viewport where the reader left it.
 *
 * Pass `defaults` as a module-level constant, not an inline object literal —
 * it is a dependency of the returned callbacks, and a fresh object each render
 * makes them change identity on every render.
 */
export function useTableParams<K extends string>(
  defaults: Readonly<Record<K, string>>,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = React.useCallback(
    (key: K): string => searchParams.get(key) ?? defaults[key],
    [searchParams, defaults],
  );

  const setParams = React.useCallback(
    (next: Partial<Record<K, string>>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(next) as [K, string][]) {
        // A parameter at its default is left out of the URL entirely, so the
        // clean `/members` and `/members?filter=current` are the same screen
        // rather than two spellings of it.
        if (value === defaults[key] || value === "") params.delete(key);
        else params.set(key, value);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams, defaults],
  );

  return { get, setParams };
}

/** `?page=` is 1-based for humans; the API counts rows from zero. */
export function pageToOffset(page: string, limit: number): number {
  const parsed = Number.parseInt(page, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return (parsed - 1) * limit;
}

export function offsetToPage(offset: number, limit: number): string {
  return String(Math.floor(offset / limit) + 1);
}

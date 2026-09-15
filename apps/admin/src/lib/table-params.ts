"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ListSort } from "@repo/constants/validators/admin-list";

import {
  readSort,
  scopeOf,
  type ReservedTableParam,
} from "@/lib/table-params.pure";

/**
 * The URL is the source of truth for every list screen's query.
 *
 * Search text, filters, the ordering and the page number all live in
 * `?q=&status=&sort=&dir=&page=`, and each change rewrites the URL, which
 * re-renders the page, which refetches from the API. Nothing is ever filtered
 * or sorted over rows already in memory — see the "Tables" section of
 * `apps/admin/AGENTS.md`.
 *
 * `router.replace` rather than `push`: paging through a list should not build
 * a twelve-entry history that the back button has to walk out of. `scroll:
 * false` keeps the viewport where the reader left it. A parameter sitting at
 * its default is stripped from the URL, so `/members` and
 * `/members?filter=current&page=1` are one screen rather than two spellings
 * of it.
 *
 * `page`, `sort` and `dir` are the hook's own: it resets the page on every
 * change, and validates the ordering against the list's key union. Declaring
 * one of them in `defaults` is a compile error, because two writers on one
 * parameter is how a filter change leaves you on page five of the old result.
 *
 * Pass `defaults` as a module-level constant, not an inline object literal —
 * it is a dependency of the returned callbacks, and a fresh object each render
 * makes them change identity on every render.
 */
export interface TableParamsOptions<S extends string> {
  /** Rows per page: what `?page=` is multiplied by to reach an offset. */
  pageSize: number;
  /**
   * The list's sortable keys and its default ordering, both taken from
   * `@repo/constants/validators/admin-list` so the screen, the API and the
   * repository cannot disagree about what is sortable.
   */
  sort?: { keys: readonly [S, ...S[]]; default: ListSort<S> };
}

export interface TableParams<K extends string, S extends string> {
  get: (key: K) => string;
  setParams: (next: Partial<Record<K | ReservedTableParam, string>>) => void;
  /** `?page=` as an offset, already clamped to >= 0. */
  offset: number;
  /**
   * Validated against `options.sort.keys`; an unknown URL value reads as the
   * default. With no `options.sort`, `S` is `never` and this is the inert
   * `{ key: "", dir: "asc" }` — typed so nothing can read a key out of it.
   */
  sort: ListSort<S>;
  /** Writes `sort` and `dir` and resets `page`. */
  setSort: (next: ListSort<S>) => void;
  /** JSON of every param in `defaults`. This is the selection scope. */
  scope: string;
}

/** The message a screen sees when it declares a key the hook owns. */
interface ReservedKeyRefusal {
  "`page`, `sort` and `dir` belong to useTableParams — remove them from `defaults`": never;
}

type NoReservedKeys<K extends string> = [
  Extract<K, ReservedTableParam>,
] extends [never]
  ? unknown
  : ReservedKeyRefusal;

const NO_SORT = { key: "", dir: "asc" } as const;

/**
 * The pre-contract form, for screens not yet migrated: the URL parameters and
 * nothing else. Such a screen still spells `page` itself, so the reserved-key
 * check cannot apply to it; passing `options` opts into the full contract.
 */
export function useTableParams<K extends string>(
  defaults: Readonly<Record<K, string>>,
): Pick<TableParams<K, never>, "get" | "setParams">;
export function useTableParams<K extends string, S extends string = never>(
  defaults: Readonly<Record<K, string>> & NoReservedKeys<K>,
  options: TableParamsOptions<S>,
): TableParams<K, S>;
export function useTableParams(
  defaults: Readonly<Record<string, string>>,
  options?: TableParamsOptions<string>,
): TableParams<string, string> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageSize = options?.pageSize ?? 0;
  const sortKeys = options?.sort?.keys;
  const defaultSort = options?.sort?.default;

  const get = React.useCallback(
    (key: string): string => searchParams.get(key) ?? defaults[key] ?? "",
    [searchParams, defaults],
  );

  const setParams = React.useCallback(
    (next: Partial<Record<string, string>>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Every change resets the page unless the caller names one: an offset
      // into the old result set means nothing against a new one, and leaving
      // that rule to fourteen call sites means forgetting it at one of them.
      const changes: Partial<Record<string, string>> = { page: "1", ...next };

      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) continue;
        // A parameter at its default is left out of the URL entirely, so the
        // clean `/members` and `/members?filter=current` are the same screen
        // rather than two spellings of it.
        const fallback =
          defaults[key] ??
          (key === "page"
            ? "1"
            : key === "sort"
              ? defaultSort?.key
              : key === "dir"
                ? defaultSort?.dir
                : undefined);
        if (value === fallback || value === "") params.delete(key);
        else params.set(key, value);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams, defaults, defaultSort],
  );

  const sort = React.useMemo(
    () =>
      sortKeys && defaultSort
        ? readSort(
            searchParams.get("sort"),
            searchParams.get("dir"),
            sortKeys,
            defaultSort,
          )
        : NO_SORT,
    [searchParams, sortKeys, defaultSort],
  );

  const setSort = React.useCallback(
    (next: ListSort<string>) => setParams({ sort: next.key, dir: next.dir }),
    [setParams],
  );

  const scope = React.useMemo(
    () => scopeOf(defaults, (key) => searchParams.get(key)),
    [defaults, searchParams],
  );

  return {
    get,
    setParams,
    offset: pageToOffset(searchParams.get("page") ?? "1", pageSize),
    sort,
    setSort,
    scope,
  };
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

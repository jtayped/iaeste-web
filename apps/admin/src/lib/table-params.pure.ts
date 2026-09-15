import {
  SORT_DIRECTIONS,
  type ListSort,
  type SortDirection,
} from "@repo/constants/validators/admin-list";

/**
 * The decisions `useTableParams` makes, with no router in sight.
 *
 * The hook itself is a thin wrapper over `useSearchParams` and
 * `router.replace`; everything worth being sure about — which way a click
 * turns a column, what a hand-typed `?sort=` resolves to, what a selection's
 * scope is made of — lives here so it can be tested as plain functions.
 */

/**
 * URL keys the hook owns outright.
 *
 * A screen never declares them in its `defaults`: `page` is reset by every
 * setter, and `sort`/`dir` are validated against the list's own key union
 * rather than a string default. Declaring one would put two writers on the
 * same parameter.
 */
export const RESERVED_TABLE_PARAMS = ["page", "sort", "dir"] as const;
export type ReservedTableParam = (typeof RESERVED_TABLE_PARAMS)[number];

/**
 * What a click on a column header asks for next.
 *
 * Clicking the active column flips it; clicking another sorts by it in the
 * direction that column opens with (`desc` for dates, where newest first is
 * what the click means). There is deliberately no third "unsorted" state —
 * the server always returns rows in some order, so a control that pretended
 * to remove the ordering would be lying about what came back.
 */
export function nextSort<S extends string>(
  current: ListSort<S>,
  column: S,
  sortFirst: SortDirection = "asc",
): ListSort<S> {
  if (current.key === column) {
    return { key: column, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key: column, dir: sortFirst };
}

/**
 * The ordering the address bar asks for, or the list's default.
 *
 * A stale bookmark or a hand-typed `?sort=surnames` on the campaigns table
 * falls back rather than travelling to the API to be rejected: the URL is
 * user input, and the only keys this list can order by are the ones it
 * declared. The two parameters resolve independently, so `?dir=desc` alone
 * means "the default column, descending".
 */
export function readSort<S extends string>(
  raw: string | null,
  rawDir: string | null,
  keys: readonly S[],
  fallback: ListSort<S>,
): ListSort<S> {
  const key = keys.find((candidate) => candidate === raw) ?? fallback.key;
  const dir =
    SORT_DIRECTIONS.find((candidate) => candidate === rawDir) ?? fallback.dir;
  return { key, dir };
}

/**
 * The identity of the result set a selection was made against.
 *
 * It is built from the screen's own `defaults` — the search and the filters —
 * and from nothing else. `page`, `sort` and `dir` cannot appear in `defaults`,
 * which is the whole point: sorting or paging reorders or re-slices the same
 * set of people, so the ticks still mean the same people and must survive.
 * Changing a filter means a different set, so the selection is dropped.
 */
export function scopeOf<K extends string>(
  defaults: Readonly<Record<K, string>>,
  read: (key: K) => string | null,
): string {
  const current: Record<string, string> = {};
  for (const key of Object.keys(defaults) as K[]) {
    current[key] = read(key) ?? defaults[key];
  }
  return JSON.stringify(current);
}

import type { LucideIcon } from "lucide-react";

import type {
  ListSort,
  SortDirection,
} from "@repo/constants/validators/admin-list";

/**
 * One column of a `<DataTable>`.
 *
 * A table stays a table at every width in this app, so a column is just a
 * header and a cell. What varies on a phone is how many columns are shown:
 * pass Tailwind's responsive display classes in `className` (it is applied to
 * both the header and the body cell, so they cannot fall out of step) to hide
 * the columns that are not worth the horizontal scroll — the row link leads to
 * the record where everything is spelled out.
 *
 * `SortKey` defaults to `never`, which is what lets a table that does not sort
 * write `DataTableColumn<Row>`: with no key union there is nothing `sortKey`
 * could hold, so the property can only be left out.
 */
export interface DataTableColumn<Row, SortKey extends string = never> {
  id: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  /**
   * Marks the cell that carries the link to the record. Exactly one column
   * per table should set it; it is also the cell drawn in medium weight.
   */
  primary?: boolean;
  /** Applied to the `<th>` and every `<td>` of this column. */
  className?: string;
  /**
   * Present when the API can order by this column. The key is the wire value
   * sent as `?sort=`, taken from the list's key union in `@repo/constants`, so
   * a column that names an ordering the route cannot resolve is a compile
   * error rather than a 422. A column without it is not sortable — there is no
   * client-side comparator anywhere in this app.
   */
  sortKey?: SortKey;
  /**
   * Direction the first click on this column asks for. Dates want `desc`
   * (newest first is what someone clicking a date column means); text and
   * numbers want `asc`, which is the default.
   */
  sortFirst?: SortDirection;
}

/**
 * The active ordering, and the way to change it.
 *
 * The table never holds the sort itself: it comes from the URL through
 * `useTableParams` and goes back there, so what is rendered is always what the
 * address bar asked the API for.
 */
export interface DataTableSort<SortKey extends string> {
  key: SortKey;
  dir: SortDirection;
  onChange: (next: ListSort<SortKey>) => void;
}

/** What the table needs to know about the query behind it. */
export interface DataTableState {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
}

export interface DataTableEmpty {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Server-side pagination. Omitted entirely for a list route that has no
 * `limit`/`offset` — a pager over a list the API returns whole would be a
 * client-side page, which this app does not do.
 */
export interface DataTablePagination {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
}

/**
 * A selection can name individual rows or the whole server-side result set.
 *
 * The second form is what keeps "select all" honest on a paginated table:
 * the caller sends its current query plus the exclusions to the server
 * instead of pretending the twenty rows in memory are the whole list.
 */
export type DataTableSelectionValue =
  | { mode: "ids"; rowIds: readonly string[] }
  | { mode: "all"; excludedRowIds: readonly string[] };

export interface DataTableSelectionHandle {
  count: number;
  value: DataTableSelectionValue;
  clear: () => void;
}

/** Optional, reusable row selection for a `<DataTable>`. */
export interface DataTableSelectionConfig<Row> {
  /** Changes whenever the server-side result set changes. */
  scope: string;
  /** Number of selectable rows across every page in this scope. */
  total: number;
  /** Rows such as already-invited members can remain visible but disabled. */
  isRowSelectable?: (row: Row) => boolean;
  /** Human label announced by each row checkbox. Defaults to the row id. */
  rowLabel?: (row: Row) => string;
  /** Rendered once in the shared selection bar. */
  actions: (selection: DataTableSelectionHandle) => React.ReactNode;
}

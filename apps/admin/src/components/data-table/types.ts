import type { LucideIcon } from "lucide-react";

/**
 * One column of a `<DataTable>`.
 *
 * A table stays a table at every width in this app, so a column is just a
 * header and a cell. What varies on a phone is how many columns are shown:
 * pass Tailwind's responsive display classes in `className` (it is applied to
 * both the header and the body cell, so they cannot fall out of step) to hide
 * the columns that are not worth the horizontal scroll — the row link leads to
 * the record where everything is spelled out.
 */
export interface DataTableColumn<Row> {
  id: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  /**
   * Marks the cell that names the record: the one drawn in medium weight, and
   * the one a reader's eye lands on first. With `rowHref` the whole row is the
   * link, so this is emphasis rather than a second link.
   */
  primary?: boolean;
  /** Applied to the `<th>` and every `<td>` of this column. */
  className?: string;
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

export interface DataTableSelectionUnit {
  singular: string;
  plural: string;
}

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
  /**
   * Rows the current query matches, selectable or not. It is the denominator
   * the selection bar counts against, which is what makes "24 de 35 membres"
   * add up on a list where eleven rows carry no checkbox. Defaults to `total`.
   */
  matchedTotal?: number;
  /** Rows such as already-invited members can remain visible but disabled. */
  isRowSelectable?: (row: Row) => boolean;
  /** Human label announced by each row checkbox. Defaults to the row id. */
  rowLabel?: (row: Row) => string;
  /**
   * What is being selected, for the selection bar's count. An operator selects
   * people, not rows, and "24 files" next to twenty visible rows reads as a
   * bug — so each table names its own unit.
   */
  unit?: DataTableSelectionUnit;
  /** Rendered once in the shared selection bar. */
  actions: (selection: DataTableSelectionHandle) => React.ReactNode;
}

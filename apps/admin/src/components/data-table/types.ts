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
   * Marks the cell that carries the link to the record. Exactly one column
   * per table should set it; it is also the cell drawn in medium weight.
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

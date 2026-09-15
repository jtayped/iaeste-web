"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { TableHead } from "@repo/ui/table";
import { cn } from "@repo/ui/lib/utils";

import type {
  DataTableColumn,
  DataTableSort,
} from "@/components/data-table/types";
import { nextSort } from "@/lib/table-params.pure";

/**
 * One header cell.
 *
 * A column is sortable only by declaring a `sortKey` the API understands; a
 * column without one renders as the plain `<th>` it always was, so a table
 * that passes no `sort` looks exactly as it did before this control existed.
 *
 * The control is a real `<button>`, not a clickable `<th>`: Enter and Space
 * come for free, it lands in the tab order ahead of the row links, and the
 * `aria-sort` on the cell tells a screen reader which column the rows are in
 * and which way. There is no "unsorted" third click — the server always has
 * an order, so a control offering to remove it would be lying.
 */
export function SortHeader<Row, SortKey extends string>({
  column,
  sort,
}: {
  column: DataTableColumn<Row, SortKey>;
  sort?: DataTableSort<SortKey>;
}) {
  const key = column.sortKey;

  if (key === undefined || !sort) {
    return (
      <TableHead className={cn("whitespace-nowrap", column.className)}>
        {column.header}
      </TableHead>
    );
  }

  const active = sort.key === key;
  // A dormant column shows the direction its first click would ask for, drawn
  // faintly: enough to read as a control on a phone, where there is no hover
  // to discover it with, without competing with the column actually in force.
  const direction = active ? sort.dir : (column.sortFirst ?? "asc");
  const Chevron = direction === "asc" ? ChevronUp : ChevronDown;

  return (
    <TableHead
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn("p-0 whitespace-nowrap", column.className)}
    >
      <button
        type="button"
        onClick={() => sort.onChange(nextSort(sort, key, column.sortFirst))}
        className={cn(
          "inline-flex min-h-11 w-full items-center gap-1 px-2 ring-ring outline-none",
          "hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset sm:min-h-10",
          active ? "text-foreground" : null,
        )}
      >
        {column.header}
        <Chevron
          aria-hidden
          className={cn("size-3.5 shrink-0", active ? null : "opacity-40")}
        />
      </button>
    </TableHead>
  );
}

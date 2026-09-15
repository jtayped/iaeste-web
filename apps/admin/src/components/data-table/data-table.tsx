"use client";

import * as React from "react";
import Link from "next/link";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
import { cn } from "@repo/ui/lib/utils";

import { Pagination } from "@/components/data-table/pagination";
import { TableScroller } from "@/components/data-table/table-scroller";
import type {
  DataTableColumn,
  DataTableEmpty,
  DataTablePagination,
  DataTableSelectionConfig,
  DataTableSort,
  DataTableState,
} from "@/components/data-table/types";
import { SelectionBar } from "@/components/data-table/selection-bar";
import { SelectionCheckbox } from "@/components/data-table/selection-checkbox";
import { SortHeader } from "@/components/data-table/sort-header";
import { TableSkeleton } from "@/components/data-table/table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { errorMessage } from "@/lib/api-error";
import {
  DEFAULT_SELECTION_UNIT,
  selectionSummary,
  useTableSelection,
} from "@/components/data-table/use-table-selection";

export interface DataTableProps<Row, SortKey extends string = never> {
  /** Describes the table for a screen reader. Required — it is the caption. */
  label: string;
  columns: readonly DataTableColumn<Row, SortKey>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** Makes the whole row one link, rather than the primary cell alone. */
  rowHref?: (row: Row) => string;
  /** The accessible name of that link: the record, not "obre". */
  rowLabel?: (row: Row) => string;
  rowActions?: (row: Row) => React.ReactNode;
  state: DataTableState;
  empty: DataTableEmpty;
  /** Only for a list route the API actually paginates. */
  pagination?: DataTablePagination;
  /**
   * The active ordering. Omitted, no header is clickable — a column's
   * `sortKey` alone draws nothing, so a screen opts in once, here.
   */
  sort?: DataTableSort<SortKey>;
  /** Search and filter controls, rendered above the table. */
  toolbar?: React.ReactNode;
  /** Optional multiselect. The table owns all checkbox/state mechanics. */
  selection?: DataTableSelectionConfig<Row>;
}

/**
 * The one table in this app.
 *
 * Every list screen renders through it, so the header row, row density,
 * loading skeleton, empty state, error state and pager are identical
 * everywhere. Three rules it exists to enforce:
 *
 * 1. **It is a real table at every width.** Rows are `<tr>`s, never stacked
 *    cards. On a narrow screen the table scrolls sideways inside
 *    `<TableScroller>` — never the page body — and pages hide their least
 *    useful columns with responsive classes in `className` rather than
 *    changing shape.
 * 2. **A row is one link, not six.** With `rowHref`, an anchor is stretched
 *    over the whole row, so the target is the row you are pointing at, while
 *    the checkbox and the action buttons sit above it — which is also why they
 *    cannot be nested inside it. `primary` then marks the cell that names the
 *    record rather than a second link to it.
 * 3. **Nothing is queried on the client.** Search, filters, the ordering and
 *    the page are URL parameters that go to the API; what is rendered is
 *    exactly what came back, in the order it came back. A table that filters
 *    or sorts rows it already holds is a bug.
 */
export function DataTable<Row, SortKey extends string = never>({
  label,
  columns,
  rows,
  rowKey,
  rowHref,
  rowLabel,
  rowActions,
  state,
  empty,
  pagination,
  sort,
  toolbar,
  selection: selectionConfig,
}: DataTableProps<Row, SortKey>) {
  const ready = !state.isPending && !state.isError;
  const selection = useTableSelection(
    selectionConfig?.scope ?? "selection-disabled",
    selectionConfig?.total ?? 0,
  );

  // A `?page=5` that outlives the result set it was written for — the search
  // narrowed to twelve rows, someone sorted, a record was deleted — asks the
  // API for an offset past the end and gets nothing back. That is not "cap
  // coincidència": the rows exist, just not there. Walk back to the first page
  // instead of reporting an empty list, and keep drawing the skeleton until the
  // answer for that page arrives, so the wrong message never appears. It would
  // not flash, either: `staleTime` is 30s, so it would sit there.
  const pastEnd =
    ready &&
    rows.length === 0 &&
    pagination !== undefined &&
    pagination.total > 0 &&
    pagination.offset >= pagination.total;
  const resetOffset = React.useRef(pagination?.onOffsetChange);
  resetOffset.current = pagination?.onOffsetChange;

  React.useEffect(() => {
    if (pastEnd) resetOffset.current?.(0);
  }, [pastEnd]);

  return (
    <div className="space-y-4">
      {toolbar}

      {state.isPending || pastEnd ? (
        // The skeleton draws the same frame itself: the route files hand it
        // straight to `<Suspense>`, with no table around it to draw one.
        <TableSkeleton columns={columns.length + (selectionConfig ? 1 : 0)} />
      ) : (
        // One framed region for every answer to the same query. Failed, empty
        // and full used to be differently shaped boxes — a dashed panel one
        // moment and a bordered table the next — so the page reflowed around a
        // region whose meaning had not changed. Only the full one scrolls; an
        // empty result has nothing to scroll.
        <div className="w-full overflow-hidden rounded-lg border border-border">
          {state.isError ? (
            <ErrorState detail={errorMessage(state.error)} />
          ) : null}

          {ready && rows.length === 0 ? (
            <EmptyState
              icon={empty.icon}
              title={empty.title}
              description={empty.description}
            />
          ) : null}

          {ready && rows.length > 0 ? (
            <TableScroller label={label} busy={state.isFetching}>
              {/* A bare `<table>` rather than `@repo/ui`'s `<Table>`: that one
              wraps itself in a second `overflow-auto` box, and a scroller
              inside a scroller means the outer one never scrolls — so it can
              neither be reached by keyboard nor show where the row continues.
              `w-full` here made the table shrink-wrap to `TableScroller`'s
              viewport instead of overflowing it, so every column compressed
              to min-content instead of the wrapper actually scrolling.
              `w-max min-w-full` gives the table its natural width — full
              width when that fits, wider than the viewport when it does not
              — which is what makes the scroll real. */}
              <table className="w-max min-w-full caption-bottom text-sm">
                <caption className="sr-only">{label}</caption>
                <TableHeader>
                  <TableRow>
                    {selectionConfig ? (
                      <TableHead className="w-12 px-0 text-center">
                        <SelectionCheckbox
                          label={`selecciona els ${selectionConfig.total} resultats`}
                          selected={selection.allSelected}
                          indeterminate={selection.isIndeterminate}
                          disabled={
                            state.isFetching || selectionConfig.total === 0
                          }
                          onChange={selection.toggleAll}
                        />
                      </TableHead>
                    ) : null}
                    {columns.map((column) => (
                      <SortHeader
                        key={column.id}
                        column={column}
                        {...(sort ? { sort } : {})}
                      />
                    ))}
                    {rowActions ? (
                      <TableHead className="text-right whitespace-nowrap">
                        accions
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const href = rowHref?.(row);
                    const key = rowKey(row);
                    const selectable =
                      selectionConfig?.isRowSelectable?.(row) ?? true;
                    const selected =
                      selectionConfig && selectable
                        ? selection.isSelected(key)
                        : false;

                    return (
                      <TableRow
                        key={key}
                        className={cn(href === undefined ? null : "relative")}
                        {...(selected ? { "data-state": "selected" } : {})}
                      >
                        {selectionConfig ? (
                          // Above the stretched link, or ticking a checkbox
                          // would open the record instead.
                          <TableCell className="relative z-10 w-12 px-0 text-center">
                            <SelectionCheckbox
                              label={`selecciona ${selectionConfig.rowLabel?.(row) ?? key}`}
                              selected={selected}
                              disabled={!selectable || state.isFetching}
                              onChange={(next) =>
                                selection.toggleRow(key, next)
                              }
                            />
                          </TableCell>
                        ) : null}
                        {columns.map((column, index) => (
                          <TableCell
                            key={column.id}
                            className={cn(
                              column.primary === true ? "font-medium" : null,
                              column.className,
                            )}
                          >
                            {/* The stretched link lives in the first cell
                            because it is positioned against the `<tr>`, and a
                            `<tr>` cannot hold anything but cells. */}
                            {index === 0 && href !== undefined ? (
                              <Link
                                href={href}
                                aria-label={rowLabel?.(row) ?? `obre ${key}`}
                                className="absolute inset-0 rounded ring-ring outline-none ring-inset focus-visible:ring-2"
                              />
                            ) : null}
                            {column.cell(row)}
                          </TableCell>
                        ))}
                        {rowActions ? (
                          <TableCell className="relative z-10 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {rowActions(row)}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </table>
            </TableScroller>
          ) : null}
        </div>
      )}

      {selectionConfig && selection.count > 0 ? (
        <SelectionBar
          summary={selectionSummary({
            count: selection.count,
            total: selectionConfig.total,
            allPages: selection.value.mode === "all",
            unit: selectionConfig.unit ?? DEFAULT_SELECTION_UNIT,
          })}
          onClear={selection.clear}
        >
          {selectionConfig.actions({
            count: selection.count,
            value: selection.value,
            clear: selection.clear,
          })}
        </SelectionBar>
      ) : null}

      {pagination && ready ? (
        <Pagination
          total={pagination.total}
          limit={pagination.limit}
          offset={pagination.offset}
          busy={state.isFetching}
          onChange={pagination.onOffsetChange}
        />
      ) : null}
    </div>
  );
}

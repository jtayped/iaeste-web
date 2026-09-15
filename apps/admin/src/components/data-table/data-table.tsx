"use client";

import * as React from "react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
import { cn } from "@repo/ui/lib/utils";

import { Pagination } from "@/components/data-table/pagination";
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
import { useTableSelection } from "@/components/data-table/use-table-selection";

export interface DataTableProps<Row, SortKey extends string = never> {
  /** Describes the table for a screen reader. Required — it is the caption. */
  label: string;
  columns: readonly DataTableColumn<Row, SortKey>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  rowHref?: (row: Row) => string;
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
 * everywhere. Two rules it exists to enforce:
 *
 * 1. **It is a real table at every width.** Rows are `<tr>`s, never stacked
 *    cards. On a narrow screen the table scrolls sideways inside its own
 *    wrapper — never the page body — and pages hide their least useful
 *    columns with responsive classes rather than changing shape.
 * 2. **Nothing is queried on the client.** Search, filters, the ordering and
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
  // coincidència": the rows exist, just not there. Walk back to the first
  // page instead of reporting an empty list, and hold the empty state until
  // the answer for that page arrives so the wrong message never flashes.
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

      {selectionConfig && selection.count > 0 ? (
        <SelectionBar count={selection.count} onClear={selection.clear}>
          {selectionConfig.actions({
            count: selection.count,
            value: selection.value,
            clear: selection.clear,
          })}
        </SelectionBar>
      ) : null}

      {state.isPending ? (
        <TableSkeleton columns={columns.length + (selectionConfig ? 1 : 0)} />
      ) : null}

      {state.isError ? <ErrorState detail={errorMessage(state.error)} /> : null}

      {ready && rows.length === 0 && !pastEnd ? (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
        />
      ) : null}

      {ready && rows.length > 0 ? (
        // The scroll container is this wrapper, not the document: a page body
        // that scrolls sideways on a phone takes the header and the nav with
        // it.
        <div
          className="w-full overflow-x-auto rounded-lg border border-border"
          aria-busy={state.isFetching}
        >
          <Table>
            <caption className="sr-only">{label}</caption>
            <TableHeader>
              <TableRow>
                {selectionConfig ? (
                  <TableHead className="w-12 px-0 text-center">
                    <SelectionCheckbox
                      label={`selecciona els ${selectionConfig.total} resultats`}
                      selected={selection.allSelected}
                      indeterminate={selection.isIndeterminate}
                      disabled={state.isFetching || selectionConfig.total === 0}
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
                    {...(selected ? { "data-state": "selected" } : {})}
                  >
                    {selectionConfig ? (
                      <TableCell className="w-12 px-0 text-center">
                        <SelectionCheckbox
                          label={`selecciona ${selectionConfig.rowLabel?.(row) ?? key}`}
                          selected={selected}
                          disabled={!selectable || state.isFetching}
                          onChange={(next) => selection.toggleRow(key, next)}
                        />
                      </TableCell>
                    ) : null}
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          column.primary === true ? "font-medium" : null,
                          column.className,
                        )}
                      >
                        {/* Only the primary cell links. A whole-row anchor
                            cannot legally contain the action buttons, and a
                            row of six links is six tab stops to one place. */}
                        {href && column.primary === true ? (
                          <Link
                            href={href}
                            className="inline-flex min-h-11 items-center rounded underline-offset-4 ring-ring outline-none hover:underline focus-visible:ring-2 md:min-h-0"
                          >
                            {column.cell(row)}
                          </Link>
                        ) : (
                          column.cell(row)
                        )}
                      </TableCell>
                    ))}
                    {rowActions ? (
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {rowActions(row)}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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

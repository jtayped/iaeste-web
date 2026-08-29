"use client";

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
  DataTableState,
} from "@/components/data-table/types";
import { TableSkeleton } from "@/components/data-table/table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { errorMessage } from "@/lib/api-error";

export interface DataTableProps<Row> {
  /** Describes the table for a screen reader. Required — it is the caption. */
  label: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  rowHref?: (row: Row) => string;
  rowActions?: (row: Row) => React.ReactNode;
  state: DataTableState;
  empty: DataTableEmpty;
  /** Only for a list route the API actually paginates. */
  pagination?: DataTablePagination;
  /** Search and filter controls, rendered above the table. */
  toolbar?: React.ReactNode;
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
 * 2. **Nothing is queried on the client.** Search, filters and the page are
 *    URL parameters that go to the API; what is rendered is exactly what came
 *    back. A table that filters rows it already holds is a bug.
 */
export function DataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  rowHref,
  rowActions,
  state,
  empty,
  pagination,
  toolbar,
}: DataTableProps<Row>) {
  const ready = !state.isPending && !state.isError;

  return (
    <div className="space-y-4">
      {toolbar}

      {state.isPending ? <TableSkeleton columns={columns.length} /> : null}

      {state.isError ? <ErrorState detail={errorMessage(state.error)} /> : null}

      {ready && rows.length === 0 ? (
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
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn("whitespace-nowrap", column.className)}
                  >
                    {column.header}
                  </TableHead>
                ))}
                {rowActions ? (
                  <TableHead className="whitespace-nowrap text-right">
                    accions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const href = rowHref?.(row);

                return (
                  <TableRow key={rowKey(row)}>
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
                            className="inline-flex min-h-11 items-center rounded underline-offset-4 outline-none ring-ring hover:underline focus-visible:ring-2 md:min-h-0"
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

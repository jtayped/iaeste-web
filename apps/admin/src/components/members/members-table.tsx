"use client";

import * as React from "react";
import { Users } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/types";
import {
  TableFilter,
  TableSearch,
  TableToolbar,
} from "@/components/data-table/toolbar";
import { StatusBadge } from "@/components/admin/status-badge";
import type { AdminMemberListItem, MemberFilter } from "@/lib/admin-types";
import { membershipStatus, roleLabel } from "@/lib/labels";
import { MEMBERS_PAGE_SIZE, useMembers } from "@/lib/members";
import { offsetToPage, pageToOffset, useTableParams } from "@/lib/table-params";

/** Module scope: `useTableParams` keeps this in its callback dependencies. */
const DEFAULTS = { q: "", filter: "current", page: "1" } as const;

const FILTERS = [
  { value: "current", label: "actuals" },
  { value: "past", label: "antics" },
  { value: "all", label: "tots" },
] as const;

const EMPTY_COPY: Record<MemberFilter, string> = {
  current: "ningú té una alta activa a la campanya actual.",
  past: "encara no hi ha ningú que hagi deixat el comitè.",
  all: "no hi ha cap membre registrat.",
};

const COLUMNS: DataTableColumn<AdminMemberListItem>[] = [
  { id: "name", header: "nom", primary: true, cell: (row) => row.name },
  { id: "surnames", header: "cognoms", cell: (row) => row.surnames },
  {
    id: "email",
    header: "correu",
    cell: (row) => row.email,
    className: "hidden lg:table-cell",
  },
  {
    id: "degree",
    header: "estudis",
    cell: (row) => row.degree,
    className: "hidden xl:table-cell",
  },
  {
    id: "studyYear",
    header: "curs",
    cell: (row) => row.studyYear,
    className: "hidden sm:table-cell tabular-nums",
  },
  {
    id: "role",
    header: "rol",
    cell: (row) => roleLabel(row.role),
    className: "hidden lg:table-cell",
  },
  {
    id: "status",
    header: "estat",
    cell: (row) =>
      row.currentStatus ? (
        <StatusBadge status={membershipStatus(row.currentStatus)} />
      ) : (
        <StatusBadge status={{ label: "sense alta activa", tone: "outline" }} />
      ),
  },
  {
    id: "totalMemberships",
    header: "campanyes",
    cell: (row) => row.totalMemberships,
    className: "hidden xl:table-cell tabular-nums",
  },
];

function isFilter(value: string): value is MemberFilter {
  return value === "all" || value === "current" || value === "past";
}

/**
 * The members table.
 *
 * `q`, `filter` and `page` are read from the URL and sent straight to
 * `GET /v1/admin/members`, which does the searching, the filtering and the
 * paging. Nothing is narrowed here — the rows on screen are the rows the API
 * returned for the parameters currently in the address bar.
 */
export function MembersTable() {
  const { get, setParams } = useTableParams(DEFAULTS);

  const q = get("q");
  const rawFilter = get("filter");
  const filter: MemberFilter = isFilter(rawFilter) ? rawFilter : "current";
  const offset = pageToOffset(get("page"), MEMBERS_PAGE_SIZE);

  const query = useMembers({ q, filter, limit: MEMBERS_PAGE_SIZE, offset });
  const rows = query.data?.rows ?? [];

  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next, page: "1" }),
    [setParams],
  );

  return (
    <DataTable
      label="llista de membres del comitè"
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.userId}
      rowHref={(row) => `/members/${row.userId}`}
      state={{
        isPending: query.isPending,
        isError: query.isError,
        isFetching: query.isFetching,
        error: query.error,
      }}
      empty={{
        icon: Users,
        title: q ? "cap coincidència" : "cap membre",
        description: q
          ? `no hi ha ningú que encaixi amb «${q}» en aquest filtre.`
          : EMPTY_COPY[filter],
      }}
      {...(query.data
        ? {
            pagination: {
              total: query.data.total,
              limit: query.data.limit,
              offset: query.data.offset,
              onOffsetChange: (next: number) =>
                setParams({
                  page: offsetToPage(next, query.data.limit),
                }),
            },
          }
        : {})}
      toolbar={
        <TableToolbar>
          <TableSearch
            id="members-search"
            value={q}
            placeholder="nom, cognoms o correu"
            onCommit={handleSearch}
          />
          <TableFilter
            value={filter}
            options={FILTERS}
            onChange={(next) => setParams({ filter: next, page: "1" })}
          />
        </TableToolbar>
      }
    />
  );
}

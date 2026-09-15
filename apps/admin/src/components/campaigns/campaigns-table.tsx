"use client";

import * as React from "react";
import { CalendarRange } from "lucide-react";

import {
  CAMPAIGN_DEFAULT_SORT,
  CAMPAIGN_SORT_KEYS,
  type CampaignSortKey,
} from "@repo/constants/validators/admin-list";
import { Badge } from "@repo/ui/badge";

import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import {
  TableFilter,
  TableSearch,
  TableToolbar,
} from "@/components/data-table/toolbar";
import type { DataTableColumn } from "@/components/data-table/types";
import type { AdminCampaignWithCounts, CampaignState } from "@/lib/admin-types";
import { CAMPAIGNS_PAGE_SIZE, useCampaigns } from "@/lib/campaigns";
import { formatDateRange } from "@/lib/format";
import { campaignState } from "@/lib/labels";
import { offsetToPage, useTableParams } from "@/lib/table-params";

const DEFAULTS = { q: "", state: "" } as const;

const CAMPAIGN_STATES = [
  "draft",
  "published",
  "archived",
] as const satisfies readonly CampaignState[];

const FILTERS = [
  { value: "all", label: "totes" },
  { value: "draft", label: "esborrany" },
  { value: "published", label: "publicada" },
  { value: "archived", label: "arxivada" },
] as const;

function isState(value: string): value is CampaignState {
  return (CAMPAIGN_STATES as readonly string[]).includes(value);
}

/**
 * `flags` is the one column with no `sortKey`: it renders two independent
 * booleans as badges, so there is no single value "order by context" could
 * mean. It stays a plain `<th>` rather than inventing an ordering — see the
 * "Tables" section of `apps/admin/AGENTS.md`.
 *
 * The three quantities open `desc`: a click on a date means "newest first" and
 * a click on a count means "most first".
 */
const COLUMNS: DataTableColumn<AdminCampaignWithCounts, CampaignSortKey>[] = [
  {
    id: "label",
    header: "campanya",
    sortKey: "label",
    primary: true,
    cell: (row) => row.label,
  },
  {
    id: "slug",
    header: "identificador",
    sortKey: "slug",
    cell: (row) => <span className="font-mono text-xs">{row.slug}</span>,
    className: "hidden lg:table-cell",
  },
  {
    id: "state",
    header: "estat",
    sortKey: "state",
    cell: (row) => <StatusBadge status={campaignState(row.state)} />,
    className: "whitespace-nowrap",
  },
  {
    id: "flags",
    header: "context",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.isCurrent ? <Badge variant="default">actual</Badge> : null}
        {/* Both of these are read, not pressed: brand blue in a row would
            outrank the buttons above the table. */}
        {row.isRegistrationOpen ? (
          <Badge variant="default">inscripcions obertes</Badge>
        ) : null}
        {!row.isCurrent && !row.isRegistrationOpen ? (
          <span className="text-muted-foreground">—</span>
        ) : null}
      </div>
    ),
    // Two chips wide, and on a phone the three columns that survive are the
    // campaign, the state it is in and how many people are in it.
    className: "hidden md:table-cell",
  },
  {
    id: "activeMembers",
    header: "membres",
    sortKey: "activeMembers",
    sortFirst: "desc",
    cell: (row) => row.activeMembers,
    className: "tabular-nums",
  },
  {
    id: "pendingReview",
    header: "per revisar",
    sortKey: "pendingReview",
    sortFirst: "desc",
    cell: (row) => row.pendingReview,
    className: "hidden sm:table-cell tabular-nums",
  },
  {
    id: "membership",
    header: "durada de l'equip",
    sortKey: "membershipStartsAt",
    sortFirst: "desc",
    // A span, not an instant: «fa 9 dies – d'aquí a 8 mesos» is not a duration
    // anyone can read, so this one stays absolute on both ends. The ordering
    // is by the start of the span, which is what `membershipStartsAt` names.
    cell: (row) =>
      formatDateRange(row.membershipStartsAt, row.membershipEndsAt),
    className: "hidden xl:table-cell whitespace-nowrap",
  },
];

/**
 * Every campaign, in one table.
 *
 * Search, state, ordering and page are URL parameters sent to
 * `GET /v1/admin/campaigns`. The API returns only the requested page, in the
 * order it was asked for, even though this list will usually be shorter than
 * one page.
 */
export function CampaignsTable({
  initialData,
}: {
  initialData: AdminCampaignWithCounts[];
}) {
  const { get, setParams, offset, sort, setSort } = useTableParams(DEFAULTS, {
    pageSize: CAMPAIGNS_PAGE_SIZE,
    sort: { keys: CAMPAIGN_SORT_KEYS, default: CAMPAIGN_DEFAULT_SORT },
  });
  const q = get("q");
  const rawState = get("state");
  const state: CampaignState | "" = isState(rawState) ? rawState : "";
  // The server-rendered rows are the *default* ordering of the whole
  // unfiltered first page. Handing them to TanStack as `initialData` for any
  // other query would answer the first header click with those same rows: the
  // chevron would move and the table would not, which reads as sorting being
  // broken. So the sort has to be at its default too.
  const isDefaultSort =
    sort.key === CAMPAIGN_DEFAULT_SORT.key &&
    sort.dir === CAMPAIGN_DEFAULT_SORT.dir;
  const isFirstUnfilteredPage =
    q === "" && state === "" && offset === 0 && isDefaultSort;

  const query = useCampaigns(
    {
      q,
      state,
      sort: sort.key,
      dir: sort.dir,
      limit: CAMPAIGNS_PAGE_SIZE,
      offset,
    },
    isFirstUnfilteredPage ? initialData : undefined,
  );
  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next }),
    [setParams],
  );

  return (
    <DataTable
      label="campanyes del comitè"
      columns={COLUMNS}
      rows={query.data?.rows ?? []}
      sort={{ key: sort.key, dir: sort.dir, onChange: setSort }}
      rowKey={(row) => row.id}
      rowHref={(row) => `/campaigns/${row.id}`}
      rowLabel={(row) => row.label}
      state={{
        isPending: query.isPending,
        isError: query.isError,
        isFetching: query.isFetching,
        error: query.error,
      }}
      empty={{
        icon: CalendarRange,
        title: q ? "cap coincidència" : "cap campanya",
        description: q
          ? `cap campanya coincideix amb «${q}» en aquest filtre.`
          : "una campanya és el curs on viuen les altes, les baixes i les sol·licituds. crea la primera per començar.",
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
            id="campaigns-search"
            value={q}
            placeholder="nom o identificador"
            onCommit={handleSearch}
          />
          <TableFilter
            value={state || "all"}
            options={FILTERS}
            onChange={(next) => setParams({ state: isState(next) ? next : "" })}
          />
        </TableToolbar>
      }
    />
  );
}

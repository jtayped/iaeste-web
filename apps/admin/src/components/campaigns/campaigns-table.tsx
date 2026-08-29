"use client";

import * as React from "react";
import { CalendarRange } from "lucide-react";

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
import { offsetToPage, pageToOffset, useTableParams } from "@/lib/table-params";

const DEFAULTS = { q: "", state: "", page: "1" } as const;

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

const COLUMNS: DataTableColumn<AdminCampaignWithCounts>[] = [
  { id: "label", header: "campanya", primary: true, cell: (row) => row.label },
  {
    id: "slug",
    header: "identificador",
    cell: (row) => <span className="font-mono text-xs">{row.slug}</span>,
    className: "hidden lg:table-cell",
  },
  {
    id: "state",
    header: "estat",
    cell: (row) => <StatusBadge status={campaignState(row.state)} />,
  },
  {
    id: "flags",
    header: "context",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.isCurrent ? <Badge variant="default">actual</Badge> : null}
        {row.isRegistrationOpen ? (
          <Badge variant="secondary">inscripcions obertes</Badge>
        ) : null}
        {!row.isCurrent && !row.isRegistrationOpen ? (
          <span className="text-muted-foreground">—</span>
        ) : null}
      </div>
    ),
  },
  {
    id: "activeMembers",
    header: "membres",
    cell: (row) => row.activeMembers,
    className: "tabular-nums",
  },
  {
    id: "pendingReview",
    header: "per revisar",
    cell: (row) => row.pendingReview,
    className: "hidden sm:table-cell tabular-nums",
  },
  {
    id: "membership",
    header: "durada de l'equip",
    cell: (row) =>
      formatDateRange(row.membershipStartsAt, row.membershipEndsAt),
    className: "hidden xl:table-cell whitespace-nowrap",
  },
];

/**
 * Every campaign, in one table.
 *
 * Search, state and page are URL parameters sent to
 * `GET /v1/admin/campaigns`. The API returns only the requested page, even
 * though this list will usually be shorter than one page.
 */
export function CampaignsTable({
  initialData,
}: {
  initialData: AdminCampaignWithCounts[];
}) {
  const { get, setParams } = useTableParams(DEFAULTS);
  const q = get("q");
  const rawState = get("state");
  const state: CampaignState | "" = isState(rawState) ? rawState : "";
  const offset = pageToOffset(get("page"), CAMPAIGNS_PAGE_SIZE);
  const isFirstUnfilteredPage = q === "" && state === "" && offset === 0;

  const query = useCampaigns(
    { q, state, limit: CAMPAIGNS_PAGE_SIZE, offset },
    isFirstUnfilteredPage ? initialData : undefined,
  );
  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next, page: "1" }),
    [setParams],
  );

  return (
    <DataTable
      label="campanyes del comitè"
      columns={COLUMNS}
      rows={query.data?.rows ?? []}
      rowKey={(row) => row.id}
      rowHref={(row) => `/campaigns/${row.id}`}
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
            onChange={(next) =>
              setParams({ state: isState(next) ? next : "", page: "1" })
            }
          />
        </TableToolbar>
      }
    />
  );
}

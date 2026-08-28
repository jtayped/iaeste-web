"use client";

import { CalendarRange } from "lucide-react";

import { Badge } from "@repo/ui/badge";

import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/types";
import type { AdminCampaignWithCounts } from "@/lib/admin-types";
import { useCampaigns } from "@/lib/campaigns";
import { formatDateRange } from "@/lib/format";
import { campaignState } from "@/lib/labels";

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
 * `GET /v1/admin/campaigns` takes no parameters at all — no search, no filter,
 * no `limit`/`offset` — so this table has no toolbar and no pager rather than
 * a client-side imitation of one. There are a handful of campaigns per decade;
 * the list is the whole set on purpose.
 */
export function CampaignsTable({
  initialData,
}: {
  initialData: AdminCampaignWithCounts[];
}) {
  const query = useCampaigns(initialData);

  return (
    <DataTable
      label="campanyes del comitè"
      columns={COLUMNS}
      rows={query.data ?? []}
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
        title: "cap campanya",
        description:
          "una campanya és el curs on viuen les altes, les baixes i les sol·licituds. crea la primera per començar.",
      }}
    />
  );
}

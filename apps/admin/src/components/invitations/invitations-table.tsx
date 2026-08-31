"use client";

import * as React from "react";
import { MailPlus } from "lucide-react";

import { Button } from "@repo/ui/button";

import {
  CampaignPicker,
  type CampaignOption,
} from "@/components/admin/campaign-picker";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import {
  TableFilter,
  TableSearch,
  TableToolbar,
} from "@/components/data-table/toolbar";
import type { DataTableColumn } from "@/components/data-table/types";
import type {
  AdminInvitation,
  InvitationStatusFilter,
} from "@/lib/admin-types";
import { formatDate, formatRelative } from "@/lib/format";
import {
  invitationStatus,
  INVITATION_FILTER_LABELS,
  INVITATION_FILTER_STATUSES,
  roleLabel,
} from "@/lib/labels";
import {
  INVITATIONS_PAGE_SIZE,
  useInvitationAction,
  useInvitations,
} from "@/lib/invitations";
import { offsetToPage, pageToOffset, useTableParams } from "@/lib/table-params";

const DEFAULTS = { campaign: "", status: "all", q: "", page: "1" } as const;

const FILTERS = INVITATION_FILTER_STATUSES.map((value) => ({
  value,
  label: INVITATION_FILTER_LABELS[value],
}));

function isStatus(value: string): value is InvitationStatusFilter {
  return (INVITATION_FILTER_STATUSES as readonly string[]).includes(value);
}

function prefillName(row: AdminInvitation): string {
  const parts = [row.prefillName, row.prefillSurnames].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(" ") : "—";
}

const COLUMNS: DataTableColumn<AdminInvitation>[] = [
  { id: "email", header: "correu", primary: true, cell: (row) => row.email },
  {
    id: "prefill",
    header: "nom",
    cell: prefillName,
    className: "hidden lg:table-cell",
  },
  {
    id: "status",
    header: "estat",
    cell: (row) => (
      <StatusBadge status={invitationStatus(row.status, row.expired)} />
    ),
  },
  {
    id: "role",
    header: "rol",
    cell: (row) => roleLabel(row.intendedRole),
    className: "hidden sm:table-cell",
  },
  {
    id: "createdAt",
    header: "enviat",
    cell: (row) => formatRelative(row.createdAt),
    className: "hidden md:table-cell whitespace-nowrap",
  },
  {
    id: "expiresAt",
    header: "caduca",
    cell: (row) =>
      row.status === "accepted" ? "—" : formatDate(row.expiresAt),
    className: "hidden xl:table-cell whitespace-nowrap",
  },
];

/**
 * The invitations table.
 *
 * Campaign, status, search and page all live in the URL and go straight to
 * `GET /v1/admin/invitations`. The status remains visible in each row while
 * the toolbar narrows the result set on the server.
 */
export function InvitationsTable({
  campaigns,
  initialCampaignId,
}: {
  campaigns: readonly CampaignOption[];
  initialCampaignId: string;
}) {
  const { get, setParams } = useTableParams(DEFAULTS);
  const campaignId = get("campaign") || initialCampaignId;
  const rawStatus = get("status");
  const status: InvitationStatusFilter = isStatus(rawStatus)
    ? rawStatus
    : "all";
  const q = get("q");
  const offset = pageToOffset(get("page"), INVITATIONS_PAGE_SIZE);

  const query = useInvitations({
    campaignId,
    status,
    q,
    limit: INVITATIONS_PAGE_SIZE,
    offset,
  });
  const action = useInvitationAction();
  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next, page: "1" }),
    [setParams],
  );

  return (
    <DataTable
      label="invitacions enviades en aquesta campanya"
      columns={COLUMNS}
      rows={query.data?.rows ?? []}
      rowKey={(row) => row.id}
      rowActions={(row) =>
        row.status === "pending" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={action.isPending}
              onClick={() => action.mutate({ kind: "resend", id: row.id })}
            >
              reenvia
            </Button>
            <ConfirmAction
              trigger={
                <Button size="sm" variant="outline" disabled={action.isPending}>
                  anul·la
                </Button>
              }
              title="anul·lar aquesta invitació?"
              description={`l'enllaç que hem enviat a ${row.email} deixarà de funcionar immediatament.`}
              confirmLabel="anul·la"
              destructive
              pending={action.isPending}
              onConfirm={() => action.mutate({ kind: "cancel", id: row.id })}
            />
          </>
        ) : null
      }
      state={{
        isPending: query.isPending,
        isError: query.isError,
        isFetching: query.isFetching,
        error: query.error,
      }}
      empty={{
        icon: MailPlus,
        title: q ? "cap coincidència" : "cap invitació",
        description: q
          ? `cap invitació coincideix amb «${q}» en aquest filtre.`
          : "encara no has convidat ningú en aquesta campanya. les invitacions salten el formulari públic i la revisió.",
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
            id="invitations-search"
            value={q}
            placeholder="correu o nom"
            onCommit={handleSearch}
          />
          <TableFilter
            value={status}
            options={FILTERS}
            onChange={(next) => setParams({ status: next, page: "1" })}
          />
          <CampaignPicker
            id="invitations-campaign"
            campaigns={campaigns}
            value={campaignId}
            onChange={(next) => setParams({ campaign: next, page: "1" })}
          />
        </TableToolbar>
      }
    />
  );
}

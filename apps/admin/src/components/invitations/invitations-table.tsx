"use client";

import { MailPlus } from "lucide-react";

import { Button } from "@repo/ui/button";

import {
  CampaignPicker,
  type CampaignOption,
} from "@/components/admin/campaign-picker";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { TableToolbar } from "@/components/data-table/toolbar";
import type { DataTableColumn } from "@/components/data-table/types";
import type { AdminInvitation } from "@/lib/admin-types";
import { formatDate, formatRelative } from "@/lib/format";
import { invitationStatus, roleLabel } from "@/lib/labels";
import { useInvitationAction, useInvitations } from "@/lib/invitations";
import { useTableParams } from "@/lib/table-params";

const DEFAULTS = { campaign: "" } as const;

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
 * `GET /v1/admin/invitations` takes `campaignId` and nothing else — no status
 * parameter, no paging — so the campaign picker is the only control, and the
 * status is a column rather than a filter. Grouping the rows by status would
 * mean sorting a set the client already holds, which is the thing the table
 * contract forbids; it is a server-side filter or it is a column.
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

  const query = useInvitations(campaignId);
  const action = useInvitationAction();

  return (
    <DataTable
      label="convits enviats en aquesta campanya"
      columns={COLUMNS}
      rows={query.data ?? []}
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
              title="anul·lar aquest convit?"
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
        title: "cap convit",
        description:
          "encara no has convidat ningú en aquesta campanya. els convits salten el formulari públic i la revisió.",
      }}
      toolbar={
        <TableToolbar>
          <CampaignPicker
            id="invitations-campaign"
            campaigns={campaigns}
            value={campaignId}
            onChange={(next) => setParams({ campaign: next })}
          />
        </TableToolbar>
      }
    />
  );
}

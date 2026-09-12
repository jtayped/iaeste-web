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

/**
 * Resend and cancel, per row.
 *
 * The mutation is instantiated here rather than once for the table so that
 * acting on one invitation does not grey out the buttons of the other
 * thirteen.
 */
function InvitationRowActions({ row }: { row: AdminInvitation }) {
  const action = useInvitationAction();
  const pending = action.isPending;

  if (row.status !== "pending") return null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        className="min-h-11 sm:min-h-9"
        disabled={pending}
        onClick={() => action.mutate({ kind: "resend", id: row.id })}
      >
        reenvia
      </Button>
      <ConfirmAction
        trigger={
          <Button
            size="sm"
            variant="ghost"
            // One of these two sends another mail and the other kills the
            // invitation; in the same outline, at the same size, the only way
            // to tell them apart was to read them. Colour does it now.
            className="min-h-11 [--button-fg:var(--destructive)] sm:min-h-9"
            disabled={pending}
          >
            anul·la
          </Button>
        }
        title="anul·lar aquesta invitació?"
        description={`l'enllaç que hem enviat a ${row.email} deixarà de funcionar immediatament.`}
        confirmLabel="anul·la"
        destructive
        pending={pending}
        onConfirm={() => action.mutate({ kind: "cancel", id: row.id })}
      />
    </div>
  );
}

/** `fa 9 dies`, with the date it stands for one hover away. */
function RelativeDate({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDate(iso)}>
      {formatRelative(iso)}
    </time>
  );
}

const STATUS_COLUMN: DataTableColumn<AdminInvitation> = {
  id: "status",
  header: "estat",
  card: "status",
  cell: (row) => (
    <StatusBadge status={invitationStatus(row.status, row.expired)} />
  ),
  className: "whitespace-nowrap",
};

const ACTIONS_COLUMN: DataTableColumn<AdminInvitation> = {
  id: "actions",
  header: "accions",
  card: "action",
  cell: (row) => <InvitationRowActions row={row} />,
  className: "text-right",
};

/**
 * A status filter other than `tots` puts the same badge on every row, which
 * says nothing the toolbar has not already said; and only a pending invitation
 * can be resent or cancelled, so on the three dead-end filters the actions
 * column would be a header over fourteen empty cells.
 */
function invitationColumns(
  status: InvitationStatusFilter,
): DataTableColumn<AdminInvitation>[] {
  return [
    {
      id: "email",
      header: "correu",
      primary: true,
      card: "title",
      cell: (row) => row.email,
    },
    {
      id: "prefill",
      header: "nom",
      card: "subtitle",
      cell: prefillName,
      className: "hidden lg:table-cell",
    },
    ...(status === "all" ? [STATUS_COLUMN] : []),
    {
      id: "createdAt",
      header: "enviat",
      cell: (row) => <RelativeDate iso={row.createdAt} />,
      className: "hidden md:table-cell whitespace-nowrap",
    },
    {
      id: "expiresAt",
      header: "caduca",
      card: "meta",
      // Both dates read the same way, so «enviat fa 9 dies» and «caduca d'aquí
      // a 5» can be compared without doing the arithmetic.
      cell: (row) =>
        row.status === "accepted" ? "—" : <RelativeDate iso={row.expiresAt} />,
      className: "hidden lg:table-cell whitespace-nowrap",
    },
    ...(status === "all" || status === "pending" ? [ACTIONS_COLUMN] : []),
  ];
}

/**
 * The invitations table.
 *
 * Campaign, status, search and page all live in the URL and go straight to
 * `GET /v1/admin/invitations`, and the active status filter also decides which
 * columns the table has anything to say with.
 *
 * There is no invitation detail route, so rows do not navigate: everything an
 * invitation is is already on the row.
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
  const columns = React.useMemo(() => invitationColumns(status), [status]);
  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next, page: "1" }),
    [setParams],
  );

  return (
    <DataTable
      label="invitacions enviades en aquesta campanya"
      columns={columns}
      rows={query.data?.rows ?? []}
      rowKey={(row) => row.id}
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

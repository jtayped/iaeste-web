"use client";

import * as React from "react";
import { MailPlus } from "lucide-react";

import {
  INVITATION_DEFAULT_SORT,
  INVITATION_SORT_KEYS,
  type InvitationSortKey,
} from "@repo/constants/validators/admin-list";
import { Button } from "@repo/ui/button";

import {
  CampaignPicker,
  type CampaignOption,
} from "@/components/admin/campaign-picker";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { StatusBadge } from "@/components/admin/status-badge";
import { BroadcastAction } from "@/components/broadcasts/broadcast-action";
import { DataTable } from "@/components/data-table/data-table";
import {
  TableFilter,
  TableSearch,
  TableToolbar,
} from "@/components/data-table/toolbar";
import type {
  DataTableColumn,
  DataTableSelectionHandle,
} from "@/components/data-table/types";
import type {
  AdminInvitation,
  InvitationStatusFilter,
} from "@/lib/admin-types";
import { invitationsAudience } from "@/lib/broadcasts";
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
import { offsetToPage, useTableParams } from "@/lib/table-params";

const DEFAULTS = { campaign: "", status: "all", q: "" } as const;

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
 * Every column orders by its own value, with the wire keys taken from
 * `INVITATION_SORT_KEYS` so a column the route cannot resolve is a compile
 * error. Three of them are worth spelling out:
 *
 * - `nom` sorts by the prefill (`name`), which most invitations do not have —
 *   an invitation is usually just an address. The route sorts the empty ones
 *   last in *both* directions, so flipping the column never opens the table on
 *   a screenful of dashes. Nothing to compensate for here.
 * - `estat` sorts by the state the badge shows, `expired` included: the route
 *   folds "pending past `expiresAt`" into the sort expression, so the expired
 *   ones group together instead of scattering among the pending.
 * - `enviat` opens `desc` (a click on a date means "newest first"), while
 *   `caduca` stays `asc` so the first click surfaces what lapses soonest.
 */
const COLUMNS: DataTableColumn<AdminInvitation, InvitationSortKey>[] = [
  {
    id: "email",
    header: "correu",
    sortKey: "email",
    primary: true,
    cell: (row) => row.email,
  },
  {
    id: "prefill",
    header: "nom",
    sortKey: "name",
    cell: prefillName,
    className: "hidden lg:table-cell",
  },
  {
    id: "status",
    header: "estat",
    sortKey: "status",
    cell: (row) => (
      <StatusBadge status={invitationStatus(row.status, row.expired)} />
    ),
  },
  {
    id: "role",
    header: "rol",
    sortKey: "role",
    cell: (row) => roleLabel(row.intendedRole),
    className: "hidden sm:table-cell",
  },
  {
    id: "createdAt",
    header: "enviat",
    sortKey: "createdAt",
    sortFirst: "desc",
    cell: (row) => formatRelative(row.createdAt),
    className: "hidden md:table-cell whitespace-nowrap",
  },
  {
    id: "expiresAt",
    header: "caduca",
    sortKey: "expiresAt",
    cell: (row) =>
      row.status === "accepted" ? "—" : formatDate(row.expiresAt),
    className: "hidden xl:table-cell whitespace-nowrap",
  },
];

/**
 * The invitations table.
 *
 * Campaign, status, search, ordering and page all live in the URL and go
 * straight to `GET /v1/admin/invitations`. The status remains visible in each
 * row while the toolbar narrows the result set on the server.
 */
export function InvitationsTable({
  campaigns,
  initialCampaignId,
  canBroadcast,
}: {
  campaigns: readonly CampaignOption[];
  initialCampaignId: string;
  /** `broadcasts.send` — resolved on the server, re-checked by the API. */
  canBroadcast: boolean;
}) {
  const { get, setParams, offset, sort, setSort, scope } = useTableParams(
    DEFAULTS,
    {
      pageSize: INVITATIONS_PAGE_SIZE,
      sort: { keys: INVITATION_SORT_KEYS, default: INVITATION_DEFAULT_SORT },
    },
  );
  const campaignId = get("campaign") || initialCampaignId;
  const rawStatus = get("status");
  const status: InvitationStatusFilter = isStatus(rawStatus)
    ? rawStatus
    : "all";
  const q = get("q");

  const query = useInvitations({
    campaignId,
    status,
    q,
    sort: sort.key,
    dir: sort.dir,
    limit: INVITATIONS_PAGE_SIZE,
    offset,
  });
  const action = useInvitationAction();
  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next }),
    [setParams],
  );

  return (
    <DataTable
      label="invitacions enviades en aquesta campanya"
      columns={COLUMNS}
      rows={query.data?.rows ?? []}
      sort={{ key: sort.key, dir: sort.dir, onChange: setSort }}
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
      {...(canBroadcast && query.data
        ? {
            selection: {
              // The scope is the search plus the filters: change the campaign,
              // the status or the search and the old ticks stop meaning
              // anything. Sorting and paging leave it alone — same set.
              scope,
              total: query.data.total,
              rowLabel: (row: AdminInvitation) => row.email,
              actions: (handle: DataTableSelectionHandle) => (
                <BroadcastAction
                  audience={invitationsAudience(handle.value, {
                    campaignId,
                    status,
                    ...(q ? { q } : {}),
                  })}
                  selection={handle}
                  unit="invitacions"
                />
              ),
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
            onChange={(next) => setParams({ status: next })}
          />
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

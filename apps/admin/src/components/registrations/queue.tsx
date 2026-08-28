"use client";

import { Inbox } from "lucide-react";

import {
  CampaignPicker,
  type CampaignOption,
} from "@/components/admin/campaign-picker";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { TableFilter, TableToolbar } from "@/components/data-table/toolbar";
import type { DataTableColumn } from "@/components/data-table/types";
import { QueueRowActions } from "@/components/registrations/queue-actions";
import type { AdminRegistration, RegistrationStatus } from "@/lib/admin-types";
import { formatRelative } from "@/lib/format";
import {
  REGISTRATION_STATUSES,
  REGISTRATION_TAB_LABELS,
  registrationStatus,
} from "@/lib/labels";
import { useRegistrations } from "@/lib/registrations";
import { useTableParams } from "@/lib/table-params";

const DEFAULTS = { status: "pending_review", campaign: "" } as const;

const FILTERS = REGISTRATION_STATUSES.map((value) => ({
  value,
  label: REGISTRATION_TAB_LABELS[value],
}));

const EMPTY_COPY: Record<RegistrationStatus, string> = {
  pending_email: "ningú està pendent de verificar el correu ara mateix.",
  pending_review: "cap sol·licitud espera revisió. tot al dia.",
  accepted: "encara no s'ha acceptat cap sol·licitud d'aquesta campanya.",
  rejected: "no s'ha rebutjat cap sol·licitud d'aquesta campanya.",
};

const COLUMNS: DataTableColumn<AdminRegistration>[] = [
  {
    id: "name",
    header: "nom",
    primary: true,
    cell: (row) => row.profileSnapshot.name,
  },
  {
    id: "surnames",
    header: "cognoms",
    cell: (row) => row.profileSnapshot.surnames,
  },
  {
    id: "email",
    header: "correu",
    cell: (row) => row.email,
    className: "hidden lg:table-cell",
  },
  {
    id: "degree",
    header: "estudis",
    cell: (row) => row.profileSnapshot.degree,
    className: "hidden xl:table-cell",
  },
  {
    id: "studyYear",
    header: "curs",
    cell: (row) => row.profileSnapshot.studyYear,
    className: "hidden sm:table-cell tabular-nums",
  },
  {
    id: "status",
    header: "estat",
    cell: (row) => <StatusBadge status={registrationStatus(row.status)} />,
  },
  {
    id: "createdAt",
    header: "enviada",
    cell: (row) => formatRelative(row.createdAt),
    className: "hidden md:table-cell whitespace-nowrap",
  },
];

function isStatus(value: string): value is RegistrationStatus {
  return (REGISTRATION_STATUSES as readonly string[]).includes(value);
}

/**
 * The review queue.
 *
 * `?status=` goes to `GET /v1/admin/registrations` as its `status` parameter —
 * the tabs are a server-side filter, not a `.filter()` over loaded rows. It
 * opens on `pending_review` because that is the tab with work in it.
 *
 * There is no pagination: the list route takes `campaignId` and `status` and
 * nothing else, so it returns the whole set and a pager would have to be a
 * client-side one. Noted in the report rather than faked here.
 */
export function RegistrationsQueue({
  campaigns,
  initialCampaignId,
}: {
  campaigns: readonly CampaignOption[];
  initialCampaignId: string;
}) {
  const { get, setParams } = useTableParams(DEFAULTS);

  const rawStatus = get("status");
  const status: RegistrationStatus = isStatus(rawStatus)
    ? rawStatus
    : "pending_review";
  const campaignId = get("campaign") || initialCampaignId;

  const query = useRegistrations(campaignId, status);

  return (
    <DataTable
      label="cua de revisió de sol·licituds"
      columns={COLUMNS}
      rows={query.data ?? []}
      rowKey={(row) => row.id}
      rowHref={(row) => `/registrations/${row.id}`}
      rowActions={(row) => <QueueRowActions registration={row} />}
      state={{
        isPending: query.isPending,
        isError: query.isError,
        isFetching: query.isFetching,
        error: query.error,
      }}
      empty={{
        icon: Inbox,
        title: "cap sol·licitud",
        description: EMPTY_COPY[status],
      }}
      toolbar={
        <TableToolbar>
          <TableFilter
            value={status}
            options={FILTERS}
            onChange={(next) => setParams({ status: next })}
          />
          <CampaignPicker
            id="registrations-campaign"
            campaigns={campaigns}
            value={campaignId}
            onChange={(next) => setParams({ campaign: next })}
          />
        </TableToolbar>
      }
    />
  );
}

"use client";

import * as React from "react";
import { Inbox } from "lucide-react";

import {
  CampaignPicker,
  type CampaignOption,
} from "@/components/admin/campaign-picker";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import {
  TableFilter,
  TableSearch,
  TableToolbar,
} from "@/components/data-table/toolbar";
import type { DataTableColumn } from "@/components/data-table/types";
import { QueueRowActions } from "@/components/registrations/queue-actions";
import type { AdminRegistration, RegistrationStatus } from "@/lib/admin-types";
import { formatRelative } from "@/lib/format";
import {
  REGISTRATION_STATUSES,
  REGISTRATION_TAB_LABELS,
  registrationStatus,
} from "@/lib/labels";
import { REGISTRATIONS_PAGE_SIZE, useRegistrations } from "@/lib/registrations";
import { offsetToPage, pageToOffset, useTableParams } from "@/lib/table-params";

const DEFAULTS = {
  status: "pending_review",
  campaign: "",
  q: "",
  page: "1",
} as const;

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
    header: "correu personal",
    cell: (row) => row.personalEmail ?? row.email,
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
 * `?q=`, `?status=`, `?campaign=` and `?page=` go straight to the API. Search,
 * status, campaign selection and paging are all server-side. It opens on
 * `pending_review` because that is the tab with work in it.
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
  const q = get("q");
  const offset = pageToOffset(get("page"), REGISTRATIONS_PAGE_SIZE);

  const query = useRegistrations({
    campaignId,
    status,
    q,
    limit: REGISTRATIONS_PAGE_SIZE,
    offset,
  });

  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next, page: "1" }),
    [setParams],
  );

  return (
    <DataTable
      label="cua de revisió de sol·licituds"
      columns={COLUMNS}
      rows={query.data?.rows ?? []}
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
        title: q ? "cap coincidència" : "cap sol·licitud",
        description: q
          ? `cap sol·licitud coincideix amb «${q}» en aquest filtre.`
          : EMPTY_COPY[status],
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
            id="registrations-search"
            value={q}
            placeholder="nom, cognoms o correu"
            onCommit={handleSearch}
          />
          <TableFilter
            value={status}
            options={FILTERS}
            onChange={(next) => setParams({ status: next, page: "1" })}
          />
          <CampaignPicker
            id="registrations-campaign"
            campaigns={campaigns}
            value={campaignId}
            onChange={(next) => setParams({ campaign: next, page: "1" })}
          />
        </TableToolbar>
      }
    />
  );
}

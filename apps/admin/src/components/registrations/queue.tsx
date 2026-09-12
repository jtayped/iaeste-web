"use client";

import * as React from "react";
import { Inbox } from "lucide-react";

import {
  CampaignPicker,
  type CampaignOption,
} from "@/components/admin/campaign-picker";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { DateCell } from "@/components/data-table/date-cell";
import {
  TableFilter,
  TableSearch,
  TableToolbar,
} from "@/components/data-table/toolbar";
import type { DataTableColumn } from "@/components/data-table/types";
import {
  hasQueueRowActions,
  QueueRowActions,
} from "@/components/registrations/queue-actions";
import type { AdminRegistration, RegistrationStatus } from "@/lib/admin-types";
import { fullName } from "@/lib/admin-types";
import {
  personName,
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

/** The queue's `?status=`, where `tots` is the absence of the API parameter. */
type RegistrationStatusFilter = RegistrationStatus | "all";

/**
 * `tots` first, as on invitacions and campanyes. Without it this was the one
 * list in the app you could not see whole; the API's `status` parameter is
 * optional and omitting it lists every status for the campaign, so the filter
 * stays server-side like all the others.
 */
const FILTERS = [
  { value: "all", label: "tots" },
  ...REGISTRATION_STATUSES.map((value) => ({
    value,
    label: REGISTRATION_TAB_LABELS[value],
  })),
];

const EMPTY_COPY: Record<RegistrationStatusFilter, string> = {
  all: "aquesta campanya no ha rebut cap sol·licitud.",
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
    cell: (row) => personName(row.profileSnapshot.name),
  },
  {
    id: "surnames",
    header: "cognoms",
    cell: (row) => personName(row.profileSnapshot.surnames),
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
    cell: (row) => (
      <span
        className="block max-w-[22ch] truncate"
        title={row.profileSnapshot.degree}
      >
        {row.profileSnapshot.degree}
      </span>
    ),
    className: "hidden xl:table-cell",
  },
  {
    // `curs` is the academic year in the campaign picker above this table.
    id: "studyYear",
    header: "any de carrera",
    cell: (row) => row.profileSnapshot.studyYear,
    className: "hidden sm:table-cell tabular-nums",
  },
];

const STATUS_COLUMN: DataTableColumn<AdminRegistration> = {
  id: "status",
  header: "estat",
  cell: (row) => <StatusBadge status={registrationStatus(row.status)} />,
  className: "whitespace-nowrap",
};

const SENT_COLUMN: DataTableColumn<AdminRegistration> = {
  id: "createdAt",
  header: "enviada",
  cell: (row) => <DateCell value={row.createdAt} />,
  className: "hidden md:table-cell",
};

/**
 * On any filter but `tots` every row would carry the name of the filter you
 * are already on — the widest thing in the row and the least informative.
 */
function registrationColumns(
  status: RegistrationStatusFilter,
): DataTableColumn<AdminRegistration>[] {
  return [
    ...COLUMNS,
    ...(status === "all" ? [STATUS_COLUMN] : []),
    SENT_COLUMN,
  ];
}

function isStatus(value: string): value is RegistrationStatusFilter {
  return (
    value === "all" ||
    (REGISTRATION_STATUSES as readonly string[]).includes(value)
  );
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
  const status: RegistrationStatusFilter = isStatus(rawStatus)
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

  const columns = React.useMemo(() => registrationColumns(status), [status]);
  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next, page: "1" }),
    [setParams],
  );

  return (
    <DataTable
      label="cua de revisió de sol·licituds"
      columns={columns}
      rows={query.data?.rows ?? []}
      rowKey={(row) => row.id}
      rowHref={(row) => `/registrations/${row.id}`}
      rowLabel={(row) => personName(fullName(row.profileSnapshot))}
      // Two of the four statuses offer nothing to do from the list, and
      // without this the `accions` header sits over a column of empty cells.
      {...(hasQueueRowActions(status)
        ? {
            rowActions: (row: AdminRegistration) => (
              <QueueRowActions registration={row} />
            ),
          }
        : {})}
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

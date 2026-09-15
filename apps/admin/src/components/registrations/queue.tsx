"use client";

import * as React from "react";
import { Inbox } from "lucide-react";

import {
  REGISTRATION_DEFAULT_SORT,
  REGISTRATION_SORT_KEYS,
  REGISTRATION_STATUSES,
  type RegistrationSortKey,
} from "@repo/constants/validators/admin-list";

import {
  CampaignPicker,
  type CampaignOption,
} from "@/components/admin/campaign-picker";
import { StatusBadge } from "@/components/admin/status-badge";
import { BroadcastAction } from "@/components/broadcasts/broadcast-action";
import { DataTable } from "@/components/data-table/data-table";
import { DateCell } from "@/components/data-table/date-cell";
import {
  TableFilter,
  TableSearch,
  TableToolbar,
} from "@/components/data-table/toolbar";
import type {
  DataTableColumn,
  DataTableSelectionHandle,
} from "@/components/data-table/types";
import { BulkAcceptAction } from "@/components/registrations/bulk-accept-action";
import {
  hasQueueRowActions,
  QueueRowActions,
} from "@/components/registrations/queue-actions";
import type { AdminRegistration, RegistrationStatus } from "@/lib/admin-types";
import { fullName } from "@/lib/admin-types";
import { registrationsAudience } from "@/lib/broadcasts";
import {
  personName,
  REGISTRATION_TAB_LABELS,
  registrationStatus,
} from "@/lib/labels";
import { REGISTRATIONS_PAGE_SIZE, useRegistrations } from "@/lib/registrations";
import { useTableParams } from "@/lib/table-params";

/**
 * `page`, `sort` and `dir` are `useTableParams`' own — declaring one here is a
 * compile error. What is left is exactly the search and the two filters, which
 * is also what the selection scope is built from.
 */
const DEFAULTS = {
  status: "pending_review",
  campaign: "",
  q: "",
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

/**
 * Every column orders by its own value, resolved in SQL by the route: `nom`
 * and `cognoms` are separate keys. The wire keys come from
 * `REGISTRATION_SORT_KEYS`, so a column the route cannot resolve is a compile
 * error.
 */
const COLUMNS: DataTableColumn<AdminRegistration, RegistrationSortKey>[] = [
  {
    id: "name",
    header: "nom",
    sortKey: "name",
    primary: true,
    cell: (row) => personName(row.profileSnapshot.name),
  },
  {
    id: "surnames",
    header: "cognoms",
    sortKey: "surnames",
    cell: (row) => personName(row.profileSnapshot.surnames),
  },
  {
    id: "email",
    header: "correu personal",
    sortKey: "email",
    cell: (row) => row.personalEmail ?? row.email,
    className: "hidden lg:table-cell",
  },
  {
    id: "degree",
    header: "estudis",
    sortKey: "degree",
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
    sortKey: "studyYear",
    cell: (row) => row.profileSnapshot.studyYear,
    className: "hidden sm:table-cell tabular-nums",
  },
];

/**
 * Only drawn on `tots`, which is also the only filter where ordering by it
 * says anything: everywhere else the rows are one status by construction.
 */
const STATUS_COLUMN: DataTableColumn<AdminRegistration, RegistrationSortKey> = {
  id: "status",
  header: "estat",
  sortKey: "status",
  cell: (row) => <StatusBadge status={registrationStatus(row.status)} />,
  className: "whitespace-nowrap",
};

/** `enviada` opens `desc`: a click on a date means "newest first", which is
 * also this queue's default ordering. */
const SENT_COLUMN: DataTableColumn<AdminRegistration, RegistrationSortKey> = {
  id: "createdAt",
  header: "enviada",
  sortKey: "createdAt",
  sortFirst: "desc",
  cell: (row) => <DateCell value={row.createdAt} />,
  className: "hidden md:table-cell",
};

/**
 * On any filter but `tots` every row would carry the name of the filter you
 * are already on — the widest thing in the row and the least informative.
 */
function registrationColumns(
  status: RegistrationStatusFilter,
): DataTableColumn<AdminRegistration, RegistrationSortKey>[] {
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
 * `?q=`, `?status=`, `?campaign=`, `?sort=`, `?dir=` and `?page=` go straight
 * to the API. Search, status, campaign selection, ordering and paging are all
 * server-side. It opens on `pending_review` because that is the tab with work
 * in it, newest first because a queue is read from the top.
 */
export function RegistrationsQueue({
  campaigns,
  initialCampaignId,
  canBroadcast,
  canReview,
}: {
  campaigns: readonly CampaignOption[];
  initialCampaignId: string;
  /** `broadcasts.send` — resolved on the server, re-checked by the API. */
  canBroadcast: boolean;
  /** `registrations.review`, which the route subtree already requires. */
  canReview: boolean;
}) {
  const { get, setParams, offset, setOffset, sort, setSort, scope } =
    useTableParams(DEFAULTS, {
      pageSize: REGISTRATIONS_PAGE_SIZE,
      sort: {
        keys: REGISTRATION_SORT_KEYS,
        default: REGISTRATION_DEFAULT_SORT,
      },
    });

  const rawStatus = get("status");
  const status: RegistrationStatusFilter = isStatus(rawStatus)
    ? rawStatus
    : "pending_review";
  const campaignId = get("campaign") || initialCampaignId;
  const q = get("q");

  const query = useRegistrations({
    campaignId,
    status,
    q,
    sort: sort.key,
    dir: sort.dir,
    limit: REGISTRATIONS_PAGE_SIZE,
    offset,
  });

  const columns = React.useMemo(() => registrationColumns(status), [status]);
  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next }),
    [setParams],
  );

  // Bulk accept is only ever legal from `pending_review`; the API skips any
  // other status silently, so offering it elsewhere — `tots` included — would
  // be a button that can only ever report "0 acceptades".
  const canBulkAccept = canReview && status === "pending_review";
  const campaignLabel =
    campaigns.find((campaign) => campaign.id === campaignId)?.label ??
    "la campanya";

  const selectionActions = (handle: DataTableSelectionHandle) => (
    <>
      {canBroadcast ? (
        <BroadcastAction
          audience={registrationsAudience(handle.value, {
            campaignId,
            // `tots` is the absence of the parameter here too: the audience
            // has no "every status" member, so a "select all" on that tab
            // sends the same unfiltered set the table is showing.
            ...(status === "all" ? {} : { status }),
            ...(q ? { q } : {}),
          })}
          selection={handle}
          unit="sol·licituds"
        />
      ) : null}
      {canBulkAccept ? (
        // The API replays a "select all" from `q` rather than from ids, so
        // this is the same search the rows on screen came back for.
        <BulkAcceptAction
          campaignId={campaignId}
          campaignLabel={campaignLabel}
          q={q}
          selection={handle}
        />
      ) : null}
    </>
  );

  return (
    <DataTable
      label="cua de revisió de sol·licituds"
      columns={columns}
      rows={query.data?.rows ?? []}
      sort={{ key: sort.key, dir: sort.dir, onChange: setSort }}
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
              onOffsetChange: setOffset,
            },
          }
        : {})}
      {...((canBroadcast || canBulkAccept) && query.data
        ? {
            selection: {
              // The search and the two filters, and nothing else: change one
              // and the old ticks stop meaning anything, while sorting or
              // paging reorders or re-slices the same set and keeps them.
              scope,
              total: query.data.total,
              unit: { singular: "sol·licitud", plural: "sol·licituds" },
              rowLabel: (row: AdminRegistration) =>
                personName(fullName(row.profileSnapshot)),
              actions: selectionActions,
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

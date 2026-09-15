"use client";

import * as React from "react";
import { Users } from "lucide-react";

import {
  MEMBER_DEFAULT_SORT,
  MEMBER_SORT_KEYS,
  type MemberSortKey,
} from "@repo/constants/validators/admin-list";

import { StatusBadge } from "@/components/admin/status-badge";
import { BroadcastAction } from "@/components/broadcasts/broadcast-action";
import { DataTable } from "@/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableSelectionHandle,
} from "@/components/data-table/types";
import {
  TableSearch,
  TableSelectFilter,
  TableToolbar,
} from "@/components/data-table/toolbar";
import { BulkInviteAction } from "@/components/members/bulk-invite-action";
import type { AdminMemberListItem, MemberFilter } from "@/lib/admin-types";
import { membersAudience } from "@/lib/broadcasts";
import { memberTargetState, membershipStatus, roleLabel } from "@/lib/labels";
import { MEMBERS_PAGE_SIZE, useMembers } from "@/lib/members";
import { offsetToPage, useTableParams } from "@/lib/table-params";

export interface MemberCampaignOption {
  id: string;
  label: string;
  isCurrent: boolean;
  isRegistrationOpen: boolean;
}

/**
 * Every column orders by its own value, so `nom` and `cognoms` are separate
 * keys rather than one ordering that secretly means surname-first. The wire
 * keys come from `MEMBER_SORT_KEYS`, so a column the route cannot resolve is a
 * compile error. `campanyes` opens `desc`: a click on a count means "most
 * first".
 */
const COLUMNS: DataTableColumn<AdminMemberListItem, MemberSortKey>[] = [
  {
    id: "name",
    header: "nom",
    sortKey: "name",
    primary: true,
    cell: (row) => row.name,
  },
  {
    id: "surnames",
    header: "cognoms",
    sortKey: "surnames",
    cell: (row) => row.surnames,
  },
  {
    id: "email",
    header: "correu",
    sortKey: "email",
    cell: (row) => row.email,
    className: "hidden lg:table-cell",
  },
  {
    id: "degree",
    header: "estudis",
    sortKey: "degree",
    cell: (row) => row.degree,
    className: "hidden xl:table-cell",
  },
  {
    id: "studyYear",
    header: "curs",
    sortKey: "studyYear",
    cell: (row) => row.studyYear,
    className: "hidden sm:table-cell tabular-nums",
  },
  {
    id: "role",
    header: "rol",
    sortKey: "role",
    cell: (row) => roleLabel(row.role),
    className: "hidden lg:table-cell",
  },
  {
    id: "status",
    header: "estat actual",
    sortKey: "status",
    cell: (row) =>
      row.currentStatus ? (
        <StatusBadge status={membershipStatus(row.currentStatus)} />
      ) : (
        <StatusBadge status={{ label: "sense alta activa", tone: "outline" }} />
      ),
  },
  {
    id: "totalMemberships",
    header: "campanyes",
    sortKey: "totalMemberships",
    sortFirst: "desc",
    cell: (row) => row.totalMemberships,
    className: "hidden xl:table-cell tabular-nums",
  },
];

/**
 * The readiness column, in its two forms.
 *
 * With no target campaign every row carries the same (absent) state, so the
 * API has nothing to order by and the tiebreaker decides on its own: a header
 * that flipped a chevron and moved no rows would read as sorting being broken.
 * It becomes sortable exactly when it means something. Two literals rather
 * than one with a conditional `sortKey`, because an explicitly `undefined`
 * optional property is not the same as an absent one.
 */
const TARGET_COLUMN: DataTableColumn<AdminMemberListItem, MemberSortKey> = {
  id: "targetState",
  header: "destí",
  cell: (row) =>
    row.targetState ? (
      <StatusBadge status={memberTargetState(row.targetState)} />
    ) : (
      "—"
    ),
};

const SORTABLE_TARGET_COLUMN: DataTableColumn<
  AdminMemberListItem,
  MemberSortKey
> = { ...TARGET_COLUMN, sortKey: "targetState" };

function sourceCampaignId(source: string): string | undefined {
  return source.startsWith("campaign:") ? source.slice(9) : undefined;
}

function sourceFilter(source: string): MemberFilter {
  if (source === "past") return "past";
  if (source === "all" || sourceCampaignId(source)) return "all";
  return "current";
}

/**
 * Members stay server-filtered while selection spans every matching page.
 * A source campaign identifies who to renew; the target campaign adds a
 * readiness state, so existing registrations, memberships and invitations
 * remain visible but cannot be selected again.
 */
export function MembersTable({
  campaigns,
  initialSource,
  initialTarget,
  canBroadcast,
}: {
  campaigns: readonly MemberCampaignOption[];
  initialSource: string;
  initialTarget: string;
  /** `broadcasts.send` — resolved on the server, re-checked by the API. */
  canBroadcast: boolean;
}) {
  const defaults = React.useMemo(
    () => ({ q: "", source: initialSource, target: initialTarget }),
    [initialSource, initialTarget],
  );
  const { get, setParams, offset, sort, setSort, scope } = useTableParams(
    defaults,
    {
      pageSize: MEMBERS_PAGE_SIZE,
      sort: { keys: MEMBER_SORT_KEYS, default: MEMBER_DEFAULT_SORT },
    },
  );

  const q = get("q");
  const rawSource = get("source");
  const source =
    rawSource === "past" ||
    rawSource === "all" ||
    campaigns.some((campaign) => `campaign:${campaign.id}` === rawSource)
      ? rawSource
      : initialSource;
  const rawTarget = get("target");
  const target =
    campaigns.find((campaign) => campaign.id === rawTarget) ??
    campaigns.find((campaign) => campaign.id === initialTarget);
  const filter = sourceFilter(source);
  const campaignId = sourceCampaignId(source);

  const query = useMembers({
    q,
    filter,
    ...(campaignId ? { campaignId } : {}),
    ...(target ? { targetCampaignId: target.id } : {}),
    sort: sort.key,
    dir: sort.dir,
    limit: MEMBERS_PAGE_SIZE,
    offset,
  });
  const rows = query.data?.rows ?? [];

  const columns = React.useMemo(
    () => [...COLUMNS, target ? SORTABLE_TARGET_COLUMN : TARGET_COLUMN],
    [target],
  );

  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next }),
    [setParams],
  );

  const selectionQuery = {
    ...(q ? { q } : {}),
    ...(campaignId ? { campaignId } : { filter }),
  };
  const sourceOptions = [
    ...campaigns.map((campaign) => ({
      value: `campaign:${campaign.id}`,
      label: `${campaign.label}${campaign.isCurrent ? " · actual" : ""}`,
    })),
    { value: "past", label: "sense alta actual" },
    { value: "all", label: "tothom" },
  ];
  const targetOptions = campaigns.map((campaign) => ({
    value: campaign.id,
    label: `${campaign.label}${campaign.isRegistrationOpen ? " · inscripcions obertes" : ""}`,
  }));

  const emptyDescription = q
    ? `no hi ha ningú que encaixi amb «${q}» en aquest filtre.`
    : campaignId
      ? "ningú té una alta activa en aquesta campanya."
      : filter === "past"
        ? "encara no hi ha ningú que hagi deixat el comitè."
        : filter === "current"
          ? "ningú té una alta activa a la campanya actual."
          : "no hi ha cap membre registrat.";

  return (
    <DataTable
      label="llista de membres del comitè"
      columns={columns}
      rows={rows}
      sort={{ key: sort.key, dir: sort.dir, onChange: setSort }}
      rowKey={(row) => row.userId}
      rowHref={(row) => `/members/${row.userId}`}
      state={{
        isPending: query.isPending,
        isError: query.isError,
        isFetching: query.isFetching,
        error: query.error,
      }}
      empty={{
        icon: Users,
        title: q ? "cap coincidència" : "cap membre",
        description: emptyDescription,
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
      {...((canBroadcast || target) && query.data
        ? {
            // Every row is selectable, not only the invite-eligible ones: the
            // selection now feeds two actions, and a broadcast has to be able
            // to reach someone who is already a member of the target campaign.
            // Ineligible rows stay visible in "destí" and the bulk invite
            // route skips them, reporting how many it left out.
            selection: {
              scope,
              total: query.data.total,
              rowLabel: (row: AdminMemberListItem) =>
                `${row.name} ${row.surnames}`.trim(),
              actions: (selection: DataTableSelectionHandle) => (
                <>
                  {canBroadcast ? (
                    <BroadcastAction
                      audience={membersAudience(
                        selection.value,
                        selectionQuery,
                      )}
                      selection={selection}
                      unit="membres"
                    />
                  ) : null}
                  {target ? (
                    <BulkInviteAction
                      campaignId={target.id}
                      campaignLabel={target.label}
                      eligibleTotal={query.data.inviteEligibleTotal}
                      query={selectionQuery}
                      selection={selection}
                    />
                  ) : null}
                </>
              ),
            },
          }
        : {})}
      toolbar={
        <TableToolbar>
          <TableSearch
            id="members-search"
            value={q}
            placeholder="nom, cognoms o correu"
            onCommit={handleSearch}
          />
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <TableSelectFilter
              id="members-source"
              label="membres de"
              value={source}
              options={sourceOptions}
              onChange={(next) => setParams({ source: next })}
            />
            {target ? (
              <TableSelectFilter
                id="members-target"
                label="convida a"
                value={target.id}
                options={targetOptions}
                onChange={(next) => setParams({ target: next })}
              />
            ) : null}
          </div>
        </TableToolbar>
      }
    />
  );
}

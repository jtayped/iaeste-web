"use client";

import * as React from "react";
import { Users } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
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
import { fullName } from "@/lib/admin-types";
import { memberRowStatus, personName, roleLabel } from "@/lib/labels";
import { MEMBERS_PAGE_SIZE, useMembers } from "@/lib/members";
import { offsetToPage, pageToOffset, useTableParams } from "@/lib/table-params";

export interface MemberCampaignOption {
  id: string;
  label: string;
  isCurrent: boolean;
  isRegistrationOpen: boolean;
}

const COLUMNS: DataTableColumn<AdminMemberListItem>[] = [
  {
    id: "name",
    header: "nom",
    primary: true,
    card: "title",
    cell: (row) => personName(row.name),
  },
  {
    id: "surnames",
    header: "cognoms",
    card: "title",
    cell: (row) => personName(row.surnames),
  },
  {
    id: "email",
    header: "correu",
    card: "subtitle",
    cell: (row) => row.email,
    className: "hidden lg:table-cell",
  },
  {
    id: "degree",
    header: "estudis",
    card: "meta",
    // A three-line degree name is what makes one row twice the height of the
    // one above it; the whole string stays reachable on the tooltip.
    cell: (row) => (
      <span className="block max-w-[22ch] truncate" title={row.degree}>
        {row.degree}
      </span>
    ),
    className: "hidden xl:table-cell",
  },
  {
    // `curs` is the academic year everywhere else in this app — in the campaign
    // selector two filters to the left of here, among others.
    id: "studyYear",
    header: "any de carrera",
    card: "meta",
    cell: (row) => row.studyYear,
    className: "hidden sm:table-cell tabular-nums",
  },
  {
    id: "role",
    header: "rol",
    cell: (row) => roleLabel(row.role),
    className: "hidden lg:table-cell",
  },
  {
    id: "status",
    header: "estat",
    card: "status",
    cell: (row) => <StatusBadge status={memberRowStatus(row)} />,
    className: "whitespace-nowrap",
  },
  {
    id: "totalMemberships",
    header: "campanyes",
    cell: (row) => row.totalMemberships,
    className: "hidden xl:table-cell tabular-nums",
  },
];

/** Announced by the row link and by the row's checkbox, so they cannot differ. */
function memberName(row: AdminMemberListItem): string {
  return personName(fullName(row));
}

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
}: {
  campaigns: readonly MemberCampaignOption[];
  initialSource: string;
  initialTarget: string;
}) {
  const defaults = React.useMemo(
    () => ({ q: "", source: initialSource, target: initialTarget, page: "1" }),
    [initialSource, initialTarget],
  );
  const { get, setParams } = useTableParams(defaults);

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
  const offset = pageToOffset(get("page"), MEMBERS_PAGE_SIZE);

  const query = useMembers({
    q,
    filter,
    ...(campaignId ? { campaignId } : {}),
    ...(target ? { targetCampaignId: target.id } : {}),
    limit: MEMBERS_PAGE_SIZE,
    offset,
  });
  const rows = query.data?.rows ?? [];

  const handleSearch = React.useCallback(
    (next: string) => setParams({ q: next, page: "1" }),
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
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.userId}
      rowHref={(row) => `/members/${row.userId}`}
      rowLabel={memberName}
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
      {...(target && query.data
        ? {
            selection: {
              scope: JSON.stringify({ q, source, target: target.id }),
              total: query.data.inviteEligibleTotal,
              isRowSelectable: (row: AdminMemberListItem) =>
                row.targetState === "eligible",
              rowLabel: memberName,
              actions: (selection: DataTableSelectionHandle) => (
                <BulkInviteAction
                  campaignId={target.id}
                  campaignLabel={target.label}
                  query={selectionQuery}
                  selection={selection}
                />
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
              onChange={(next) => setParams({ source: next, page: "1" })}
            />
            {target ? (
              <TableSelectFilter
                id="members-target"
                label="convida a"
                value={target.id}
                options={targetOptions}
                onChange={(next) => setParams({ target: next, page: "1" })}
              />
            ) : null}
          </div>
        </TableToolbar>
      }
    />
  );
}

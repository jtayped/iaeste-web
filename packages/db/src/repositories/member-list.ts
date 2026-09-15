import {
  and,
  eq,
  ilike,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  MEMBER_DEFAULT_SORT,
  type MemberSortKey,
  type SortDirection,
} from "@repo/constants/validators/admin-list";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { memberInvitation } from "../schema/member-invitation";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import { membershipCampaign } from "../schema/membership-campaign";
import { registration } from "../schema/registration";
import { userEmail } from "../schema/user-email";
import { orderTerms, type SortTerm } from "./sort";

export type MemberListFilter = "all" | "current" | "past";

export interface MemberListParams {
  q?: string;
  filter?: MemberListFilter;
  /** Exact source campaign. When present it replaces current/past. */
  campaignId?: string;
  /** Adds invitation readiness relative to this campaign. */
  targetCampaignId?: string;
  /** Defaults to the surname-first order this list has always had. */
  sort?: MemberSortKey;
  dir?: SortDirection;
  limit: number;
  offset: number;
}

export type MemberTargetState =
  "eligible" | "member" | "registered" | "invited";

export interface MemberListRow {
  userId: string;
  name: string;
  surnames: string;
  email: string;
  degree: string;
  studyYear: number;
  role: string | null;
  currentStatus: string | null;
  totalMemberships: number;
  targetState: MemberTargetState | null;
}

export type MemberSelection =
  | { mode: "ids"; userIds: string[] }
  | {
      mode: "all";
      q?: string;
      filter?: MemberListFilter;
      campaignId?: string;
      excludedUserIds: string[];
    };

export interface MemberInvitationCandidate {
  userId: string;
  name: string;
  surnames: string;
  email: string;
  targetState: MemberTargetState;
}

/** Search, campaign filtering and cross-page selection for the member table. */
export function createMemberListQueries(db: Db) {
  const currentStatus = sql<string | null>`(
    select m.status from ${membership} m
    join ${membershipCampaign} c on c.id = m.campaign_id
    where m.user_id = ${memberProfile.userId} and c.is_current
    limit 1
  )`;
  const totalMemberships = sql<number>`(
    select count(*) from ${membership} m2 where m2.user_id = ${memberProfile.userId}
  )`;

  /**
   * What each sort key orders by.
   *
   * Every column of the table is here, sorting by its own value — `nom` and
   * `cognoms` are separate keys rather than one "order by name", because an
   * operator may know someone by either. Each falls back to the other, so
   * `surnames asc` is exactly the order this list has always had and `name`
   * still groups a family together.
   */
  function sortTerms(key: MemberSortKey, target: SQL): readonly SortTerm[] {
    switch (key) {
      case "name":
        return [memberProfile.name, memberProfile.surnames];
      case "surnames":
        return [memberProfile.surnames, memberProfile.name];
      case "email":
        return [user.email];
      case "degree":
        return [memberProfile.degree];
      case "studyYear":
        return [memberProfile.studyYear];
      case "role":
        return [user.role];
      case "status":
        return [currentStatus];
      case "totalMemberships":
        return [totalMemberships];
      case "targetState":
        // The same value for every row when no target campaign is in play,
        // which is also the only time the column is not rendered; the
        // tiebreaker then decides the order on its own.
        return [target];
    }
  }

  function whereClause(
    params: Pick<MemberListParams, "q" | "filter" | "campaignId">,
  ) {
    const clauses = [];
    const needle = params.q?.trim();
    if (needle) {
      const like = `%${needle}%`;
      const search = or(
        ilike(memberProfile.name, like),
        ilike(memberProfile.surnames, like),
        ilike(user.email, like),
      );
      if (search) clauses.push(search);
    }
    if (params.campaignId) {
      clauses.push(sql`exists (
        select 1 from ${membership} source_membership
        where source_membership.user_id = ${memberProfile.userId}
          and source_membership.campaign_id = ${params.campaignId}
          and source_membership.status = 'active'
      )`);
    } else if (params.filter === "current") {
      clauses.push(sql`${currentStatus} = 'active'`);
    } else if (params.filter === "past") {
      clauses.push(
        sql`(${currentStatus} is null or ${currentStatus} <> 'active')`,
      );
    }
    return clauses.length ? and(...clauses) : undefined;
  }

  function targetState(targetCampaignId: string) {
    const registrationMatches = sql`(
      ${registration.email} = ${user.email}
      or ${registration.universityEmail} = ${user.email}
      or ${registration.personalEmail} = ${user.email}
      or exists (
        select 1 from ${userEmail}
        where ${userEmail.userId} = ${memberProfile.userId}
          and ${userEmail.email} in (
            ${registration.email},
            ${registration.universityEmail},
            ${registration.personalEmail}
          )
      )
    )`;
    const invitationMatches = sql`(
      ${memberInvitation.email} = ${user.email}
      or exists (
        select 1 from ${userEmail}
        where ${userEmail.userId} = ${memberProfile.userId}
          and ${userEmail.email} = ${memberInvitation.email}
      )
    )`;

    return sql<MemberTargetState>`case
      when exists (
        select 1 from ${membership} target_membership
        where target_membership.user_id = ${memberProfile.userId}
          and target_membership.campaign_id = ${targetCampaignId}
          and target_membership.status = 'active'
      ) then 'member'
      when exists (
        select 1 from ${registration}
        where ${registration.campaignId} = ${targetCampaignId}
          and ${registration.status} <> 'rejected'
          and ${registrationMatches}
      ) then 'registered'
      when exists (
        select 1 from ${memberInvitation}
        where ${memberInvitation.campaignId} = ${targetCampaignId}
          and ${memberInvitation.status} = 'pending'
          and ${memberInvitation.expiresAt} > now()
          and ${invitationMatches}
      ) then 'invited'
      else 'eligible'
    end`;
  }

  return {
    async list(params: MemberListParams): Promise<{
      rows: MemberListRow[];
      total: number;
      inviteEligibleTotal: number;
    }> {
      const where = whereClause(params);
      const target = params.targetCampaignId
        ? targetState(params.targetCampaignId)
        : // Typed rather than a bare `null`: an untyped null is a valid value
          // to select but not a valid one to ORDER BY, and `sort=targetState`
          // with no target campaign would be a 500.
          sql<MemberTargetState | null>`null::text`;

      const [rows, [countRow], [eligibleCountRow]] = await Promise.all([
        db
          .select({
            userId: memberProfile.userId,
            name: memberProfile.name,
            surnames: memberProfile.surnames,
            email: user.email,
            degree: memberProfile.degree,
            studyYear: memberProfile.studyYear,
            role: user.role,
            currentStatus,
            totalMemberships,
            targetState: target,
          })
          .from(memberProfile)
          .innerJoin(user, eq(user.id, memberProfile.userId))
          .where(where)
          .orderBy(
            ...orderTerms(
              sortTerms(params.sort ?? MEMBER_DEFAULT_SORT.key, target),
              params.dir ?? MEMBER_DEFAULT_SORT.dir,
              memberProfile.userId,
            ),
          )
          .limit(params.limit)
          .offset(params.offset),
        db
          .select({ value: sql<number>`count(*)` })
          .from(memberProfile)
          .innerJoin(user, eq(user.id, memberProfile.userId))
          .where(where),
        params.targetCampaignId
          ? db
              .select({ value: sql<number>`count(*)` })
              .from(memberProfile)
              .innerJoin(user, eq(user.id, memberProfile.userId))
              .where(and(where, sql`${target} = 'eligible'`))
          : Promise.resolve([{ value: 0 }]),
      ]);

      return {
        rows: rows.map((row) => ({
          ...row,
          currentStatus: row.currentStatus ?? null,
          totalMemberships: Number(row.totalMemberships),
          targetState: row.targetState ?? null,
        })),
        total: Number(countRow?.value ?? 0),
        inviteEligibleTotal: Number(eligibleCountRow?.value ?? 0),
      };
    },

    /**
     * The same cross-page selection as `selection`, without the
     * invitation-readiness join: a broadcast goes to whoever the operator
     * picked, whether or not they could be invited to some campaign.
     */
    async broadcastSelection(
      selection: MemberSelection,
      limit: number,
    ): Promise<Omit<MemberInvitationCandidate, "targetState">[]> {
      const selected =
        selection.mode === "ids"
          ? inArray(memberProfile.userId, selection.userIds)
          : whereClause(selection);
      const exclusions =
        selection.mode === "all" && selection.excludedUserIds.length > 0
          ? notInArray(memberProfile.userId, selection.excludedUserIds)
          : undefined;

      return db
        .select({
          userId: memberProfile.userId,
          name: memberProfile.name,
          surnames: memberProfile.surnames,
          email: user.email,
        })
        .from(memberProfile)
        .innerJoin(user, eq(user.id, memberProfile.userId))
        .where(and(selected, exclusions))
        .orderBy(
          memberProfile.surnames,
          memberProfile.name,
          memberProfile.userId,
        )
        .limit(limit);
    },

    async selection(
      selection: MemberSelection,
      targetCampaignId: string,
      limit: number,
    ): Promise<MemberInvitationCandidate[]> {
      const target = targetState(targetCampaignId);
      const selected =
        selection.mode === "ids"
          ? inArray(memberProfile.userId, selection.userIds)
          : whereClause(selection);
      const exclusions =
        selection.mode === "all" && selection.excludedUserIds.length > 0
          ? notInArray(memberProfile.userId, selection.excludedUserIds)
          : undefined;

      return db
        .select({
          userId: memberProfile.userId,
          name: memberProfile.name,
          surnames: memberProfile.surnames,
          email: user.email,
          targetState: target,
        })
        .from(memberProfile)
        .innerJoin(user, eq(user.id, memberProfile.userId))
        .where(and(selected, exclusions))
        .orderBy(
          memberProfile.surnames,
          memberProfile.name,
          memberProfile.userId,
        )
        .limit(limit);
    },
  };
}

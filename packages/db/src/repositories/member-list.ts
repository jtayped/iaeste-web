import { and, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { memberInvitation } from "../schema/member-invitation";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import { membershipCampaign } from "../schema/membership-campaign";
import { registration } from "../schema/registration";
import { userEmail } from "../schema/user-email";

export type MemberListFilter = "all" | "current" | "past";

export interface MemberListParams {
  q?: string;
  filter?: MemberListFilter;
  /** Exact source campaign. When present it replaces current/past. */
  campaignId?: string;
  /** Adds invitation readiness relative to this campaign. */
  targetCampaignId?: string;
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
        : sql<MemberTargetState | null>`null`;

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
          .orderBy(memberProfile.surnames, memberProfile.name)
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
        .orderBy(memberProfile.surnames, memberProfile.name)
        .limit(limit);
    },
  };
}

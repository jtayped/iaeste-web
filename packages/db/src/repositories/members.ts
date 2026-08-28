import { and, eq, ilike, or, sql } from "drizzle-orm";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import { membershipCampaign } from "../schema/membership-campaign";

export type MemberListFilter = "all" | "current" | "past";

export interface MemberListParams {
  q?: string;
  filter?: MemberListFilter;
  limit: number;
  offset: number;
}

export interface MemberListRow {
  userId: string;
  name: string;
  surnames: string;
  email: string;
  degree: string;
  studyYear: number;
  role: string | null;
  /** Their membership status in the current campaign, or null if none. */
  currentStatus: string | null;
  totalMemberships: number;
}

/** One membership row for a campaign, flattened for the CSV export. */
export interface MemberExportRow {
  name: string;
  surnames: string;
  email: string;
  phone: string;
  degree: string;
  studyYear: number | null;
  role: string | null;
  status: string;
  source: string;
  joinedAt: Date;
  endedAt: Date | null;
  endedReason: string | null;
}

/**
 * Server-side member list — search (`q` over name/surnames/email), a
 * current/past filter, and `limit`/`offset` pagination from the start (the
 * plan: build it paginated rather than retrofitting `currentMembers`).
 * "Member" means anyone with a `member_profile` row.
 */
export function createMemberRepository(db: Db) {
  const currentStatusExpr = sql<string | null>`(
    select m.status from ${membership} m
    join ${membershipCampaign} c on c.id = m.campaign_id
    where m.user_id = ${memberProfile.userId} and c.is_current
    limit 1
  )`;
  const totalExpr = sql<number>`(
    select count(*) from ${membership} m2 where m2.user_id = ${memberProfile.userId}
  )`;

  function whereClause(params: MemberListParams) {
    const clauses = [];
    if (params.q && params.q.trim()) {
      const needle = `%${params.q.trim()}%`;
      clauses.push(
        or(
          ilike(memberProfile.name, needle),
          ilike(memberProfile.surnames, needle),
          ilike(user.email, needle),
        ),
      );
    }
    if (params.filter === "current") {
      clauses.push(sql`${currentStatusExpr} = 'active'`);
    } else if (params.filter === "past") {
      clauses.push(
        sql`(${currentStatusExpr} is null or ${currentStatusExpr} <> 'active')`,
      );
    }
    return clauses.length ? and(...clauses) : undefined;
  }

  return {
    async list(
      params: MemberListParams,
    ): Promise<{ rows: MemberListRow[]; total: number }> {
      const where = whereClause(params);

      const rows = await db
        .select({
          userId: memberProfile.userId,
          name: memberProfile.name,
          surnames: memberProfile.surnames,
          email: user.email,
          degree: memberProfile.degree,
          studyYear: memberProfile.studyYear,
          role: user.role,
          currentStatus: currentStatusExpr,
          totalMemberships: totalExpr,
        })
        .from(memberProfile)
        .innerJoin(user, eq(user.id, memberProfile.userId))
        .where(where)
        .orderBy(memberProfile.surnames, memberProfile.name)
        .limit(params.limit)
        .offset(params.offset);

      const [countRow] = await db
        .select({ value: sql<number>`count(*)` })
        .from(memberProfile)
        .innerJoin(user, eq(user.id, memberProfile.userId))
        .where(where);

      return {
        rows: rows.map((row) => ({
          ...row,
          currentStatus: row.currentStatus ?? null,
          totalMemberships: Number(row.totalMemberships),
        })),
        total: Number(countRow?.value ?? 0),
      };
    },

    /** The profile + account role for one member, or undefined. */
    async getProfile(userId: string) {
      const [row] = await db
        .select({
          userId: memberProfile.userId,
          name: memberProfile.name,
          surnames: memberProfile.surnames,
          email: user.email,
          phoneE164: memberProfile.phoneE164,
          phoneDisplay: memberProfile.phoneDisplay,
          degree: memberProfile.degree,
          studyYear: memberProfile.studyYear,
          role: user.role,
          createdAt: memberProfile.createdAt,
        })
        .from(memberProfile)
        .innerJoin(user, eq(user.id, memberProfile.userId))
        .where(eq(memberProfile.userId, userId));
      return row;
    },

    /** Sets `user.role`. Better Auth's admin plugin owns the column values. */
    async setRole(userId: string, role: "member" | "admin") {
      const [row] = await db
        .update(user)
        .set({ role })
        .where(eq(user.id, userId))
        .returning({ id: user.id, role: user.role });
      return row;
    },

    /**
     * Every membership for one campaign, flattened with the person's profile
     * and account role, ordered by surname — the CSV export's full row set,
     * unpaginated on purpose (an export is the whole thing). `member_profile`
     * is left-joined so a membership without one is still exported rather than
     * silently dropped.
     */
    async exportForCampaign(campaignId: string): Promise<MemberExportRow[]> {
      const rows = await db
        .select({
          name: memberProfile.name,
          surnames: memberProfile.surnames,
          email: user.email,
          phone: memberProfile.phoneDisplay,
          degree: memberProfile.degree,
          studyYear: memberProfile.studyYear,
          role: user.role,
          status: membership.status,
          source: membership.source,
          joinedAt: membership.joinedAt,
          endedAt: membership.endedAt,
          endedReason: membership.endedReason,
        })
        .from(membership)
        .innerJoin(user, eq(user.id, membership.userId))
        .leftJoin(memberProfile, eq(memberProfile.userId, membership.userId))
        .where(eq(membership.campaignId, campaignId))
        .orderBy(memberProfile.surnames, memberProfile.name);

      return rows.map((row) => ({
        name: row.name ?? "",
        surnames: row.surnames ?? "",
        email: row.email,
        phone: row.phone ?? "",
        degree: row.degree ?? "",
        studyYear: row.studyYear ?? null,
        role: row.role,
        status: row.status,
        source: row.source,
        joinedAt: row.joinedAt,
        endedAt: row.endedAt,
        endedReason: row.endedReason,
      }));
    },
  };
}

export type MemberRepository = ReturnType<typeof createMemberRepository>;

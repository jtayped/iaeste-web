import { eq } from "drizzle-orm";

import type { MemberProfile } from "@repo/constants/validators/registration";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import {
  createMemberListQueries,
  type MemberListParams,
  type MemberSelection,
} from "./member-list";

export type {
  MemberInvitationCandidate,
  MemberListFilter,
  MemberListParams,
  MemberListRow,
  MemberSelection,
  MemberTargetState,
} from "./member-list";

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
  const listQueries = createMemberListQueries(db);

  async function getProfile(userId: string) {
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
  }

  return {
    list: (params: MemberListParams) => listQueries.list(params),

    /** Resolve a bulk-selection descriptor without loading page by page. */
    listInvitationSelection(
      selection: MemberSelection,
      targetCampaignId: string,
      limit: number,
    ) {
      return listQueries.selection(selection, targetCampaignId, limit);
    },

    /** The profile + account role for one member, or undefined. */
    getProfile,

    /**
     * Updates the signed-in member's mutable details and keeps Better Auth's
     * display name in sync. The API chooses `userId` from the session, never
     * from this input.
     */
    async updateProfile(
      userId: string,
      input: MemberProfile & { phoneE164: string; phoneDisplay: string },
    ) {
      const now = new Date();
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(memberProfile)
          .set({
            name: input.name,
            surnames: input.surnames,
            phoneE164: input.phoneE164,
            phoneDisplay: input.phoneDisplay,
            degree: input.degree,
            studyYear: input.year,
            updatedAt: now,
          })
          .where(eq(memberProfile.userId, userId))
          .returning({ userId: memberProfile.userId });

        if (!row) return undefined;

        await tx
          .update(user)
          .set({
            name: `${input.name} ${input.surnames}`.trim(),
            updatedAt: now,
          })
          .where(eq(user.id, userId));

        return row;
      });

      return updated ? getProfile(userId) : undefined;
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

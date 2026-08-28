import { and, count, desc, eq, notInArray, sql } from "drizzle-orm";

import type { Db } from "../client";
import { membership, type membershipStatusEnum } from "../schema/membership";
import { membershipCampaign } from "../schema/membership-campaign";
import { createMembershipEventRepository } from "./membership-events";
import { IllegalTransitionError, NotFoundError } from "./errors";
import { firstOrThrow } from "./util";

export type MembershipStatus = (typeof membershipStatusEnum.enumValues)[number];

export interface JoinInput {
  userId: string;
  campaignId: string;
  source: string;
  actorId?: string | null;
}

/**
 * `db` may be a transaction (`tx`) so callers (the registration/invitation
 * acceptance flows) can join a membership row, its audit event, and any
 * sibling writes (creating the `user`, upserting `member_profile`) as one
 * atomic unit — see `registrations.ts`'s `accept`.
 */
async function getForUserAndCampaign(
  db: Db,
  userId: string,
  campaignId: string,
) {
  const [row] = await db
    .select()
    .from(membership)
    .where(
      and(eq(membership.userId, userId), eq(membership.campaignId, campaignId)),
    );
  return row;
}

/** Total membership rows this user has ever had, across every campaign. */
async function countForUser(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(membership)
    .where(eq(membership.userId, userId));
  return row?.value ?? 0;
}

export function createMembershipRepository(db: Db) {
  const events = createMembershipEventRepository(db);

  return {
    async getById(id: string) {
      const [row] = await db
        .select()
        .from(membership)
        .where(eq(membership.id, id));
      return row;
    },

    getForUserAndCampaign: (userId: string, campaignId: string) =>
      getForUserAndCampaign(db, userId, campaignId),

    countForUser: (userId: string) => countForUser(db, userId),

    /** Every membership row this user has, with its campaign, newest first. */
    async listForUser(userId: string) {
      return db
        .select({ membership, campaign: membershipCampaign })
        .from(membership)
        .innerJoin(
          membershipCampaign,
          eq(membership.campaignId, membershipCampaign.id),
        )
        .where(eq(membership.userId, userId))
        .orderBy(desc(membershipCampaign.membershipStartsAt));
    },

    /**
     * Creates the membership row and its audit event together. "New" vs
     * "renewed" is derived here from the user's existing row count — the
     * database decides, not whatever caller happens to invoke this (see
     * IA-11's acceptance criteria).
     */
    async join(input: JoinInput) {
      const existing = await getForUserAndCampaign(
        db,
        input.userId,
        input.campaignId,
      );
      if (existing) {
        throw new IllegalTransitionError(
          `User ${input.userId} already has a membership row for campaign ${input.campaignId}`,
        );
      }

      const priorCount = await countForUser(db, input.userId);
      const eventType = priorCount === 0 ? "joined" : "renewed";

      const row = firstOrThrow(
        await db
          .insert(membership)
          .values({
            userId: input.userId,
            campaignId: input.campaignId,
            source: input.source,
            status: "active",
          })
          .returning(),
      );

      await events.record({
        eventType,
        targetUserId: input.userId,
        campaignId: input.campaignId,
        actorId: input.actorId ?? null,
      });

      return row;
    },

    async leave(
      membershipId: string,
      options: { actorId?: string | null; reason?: string } = {},
    ) {
      return transitionEnd(db, events, membershipId, {
        toStatus: "left",
        eventType: "left",
        actorId: options.actorId,
        reason: options.reason,
      });
    },

    async kick(
      membershipId: string,
      options: { actorId?: string | null; reason: string },
    ) {
      if (!options.reason) {
        throw new IllegalTransitionError("Kicking a member requires a reason");
      }
      return transitionEnd(db, events, membershipId, {
        toStatus: "kicked",
        eventType: "kicked",
        actorId: options.actorId,
        reason: options.reason,
      });
    },

    /**
     * Explicit, audited reversal of a mistaken kick or leave — never a
     * silent status flip (docs/membership-lifecycle.md question 9).
     */
    async restore(
      membershipId: string,
      options: { actorId?: string | null } = {},
    ) {
      const [row] = await db
        .update(membership)
        .set({ status: "active", endedAt: null, endedReason: null })
        .where(
          and(
            eq(membership.id, membershipId),
            sql`${membership.status} in ('left', 'kicked')`,
          ),
        )
        .returning();

      if (!row) {
        const current = await db
          .select()
          .from(membership)
          .where(eq(membership.id, membershipId));
        if (current.length === 0) {
          throw new NotFoundError(`No membership with id ${membershipId}`);
        }
        throw new IllegalTransitionError(
          `Cannot restore membership ${membershipId}: not in left/kicked status`,
        );
      }

      await events.record({
        eventType: "restored",
        targetUserId: row.userId,
        campaignId: row.campaignId,
        actorId: options.actorId ?? null,
      });

      return row;
    },

    /** "Current members": active rows in whichever campaign is current. */
    async currentMembers() {
      return db
        .select({ membership, campaign: membershipCampaign })
        .from(membership)
        .innerJoin(
          membershipCampaign,
          eq(membership.campaignId, membershipCampaign.id),
        )
        .where(
          and(
            eq(membershipCampaign.isCurrent, true),
            eq(membership.status, "active"),
          ),
        );
    },

    /** Everyone who has ever had a membership row but is not currently active. */
    async pastMembers() {
      const currentUserIds = db
        .select({ userId: membership.userId })
        .from(membership)
        .innerJoin(
          membershipCampaign,
          eq(membership.campaignId, membershipCampaign.id),
        )
        .where(
          and(
            eq(membershipCampaign.isCurrent, true),
            eq(membership.status, "active"),
          ),
        );

      return db
        .selectDistinctOn([membership.userId], { userId: membership.userId })
        .from(membership)
        .where(notInArray(membership.userId, currentUserIds));
    },

    /**
     * Classifies each currently-active member as "new" (this is their only
     * membership row ever) or "returning" (they have more than one) — see
     * the plan's "Rules" section, restated verbatim in IA-11's task text.
     */
    async newVsReturningCurrentMembers() {
      // A correlated subquery, not `count(*) over (partition by ...)`: the
      // window function would only see rows already filtered to "current
      // and active", so every user would count as exactly 1 there. This
      // counts each user's rows across the whole table instead.
      const rows = await db
        .select({
          userId: membership.userId,
          totalMemberships: sql<number>`(select count(*) from membership m2 where m2.user_id = ${membership.userId})`,
        })
        .from(membership)
        .innerJoin(
          membershipCampaign,
          eq(membership.campaignId, membershipCampaign.id),
        )
        .where(
          and(
            eq(membershipCampaign.isCurrent, true),
            eq(membership.status, "active"),
          ),
        );

      return rows.map((row) => ({
        userId: row.userId,
        classification:
          Number(row.totalMemberships) > 1
            ? ("returning" as const)
            : ("new" as const),
      }));
    },

    /**
     * People with a row in some non-current campaign but no row at all in
     * the current one — "not renewing means simply having no row in the new
     * campaign. No bulk deactivation, ever." (plan's "Rules" section).
     */
    async unrenewedPastMembers() {
      const currentUserIds = db
        .select({ userId: membership.userId })
        .from(membership)
        .innerJoin(
          membershipCampaign,
          eq(membership.campaignId, membershipCampaign.id),
        )
        .where(eq(membershipCampaign.isCurrent, true));

      return db
        .selectDistinctOn([membership.userId], { userId: membership.userId })
        .from(membership)
        .innerJoin(
          membershipCampaign,
          eq(membership.campaignId, membershipCampaign.id),
        )
        .where(
          and(
            eq(membershipCampaign.isCurrent, false),
            notInArray(membership.userId, currentUserIds),
          ),
        );
    },
  };
}

async function transitionEnd(
  db: Db,
  events: ReturnType<typeof createMembershipEventRepository>,
  membershipId: string,
  options: {
    toStatus: Extract<MembershipStatus, "left" | "kicked">;
    eventType: "left" | "kicked";
    actorId?: string | null;
    reason?: string;
  },
) {
  const [row] = await db
    .update(membership)
    .set({
      status: options.toStatus,
      endedAt: new Date(),
      endedReason: options.reason ?? null,
    })
    .where(
      and(eq(membership.id, membershipId), eq(membership.status, "active")),
    )
    .returning();

  if (!row) {
    const current = await db
      .select()
      .from(membership)
      .where(eq(membership.id, membershipId));
    if (current.length === 0) {
      throw new NotFoundError(`No membership with id ${membershipId}`);
    }
    throw new IllegalTransitionError(
      `Cannot transition membership ${membershipId} to ${options.toStatus}: not active`,
    );
  }

  await events.record({
    eventType: options.eventType,
    targetUserId: row.userId,
    campaignId: row.campaignId,
    actorId: options.actorId ?? null,
    details: options.reason ? { reason: options.reason } : undefined,
  });

  return row;
}

export type MembershipRepository = ReturnType<
  typeof createMembershipRepository
>;

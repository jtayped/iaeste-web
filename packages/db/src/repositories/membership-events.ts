import { desc, eq } from "drizzle-orm";

import type { Db } from "../client";
import {
  membershipEvent,
  type membershipEventTypeEnum,
} from "../schema/membership-event";
import { firstOrThrow } from "./util";

export type MembershipEventType =
  (typeof membershipEventTypeEnum.enumValues)[number];

export interface RecordEventInput {
  eventType: MembershipEventType;
  targetUserId: string;
  actorId?: string | null;
  campaignId?: string | null;
  details?: unknown;
}

/**
 * Takes `db` rather than a pool so callers can pass a transaction (`tx`) —
 * every status transition in this package records its event in the same
 * transaction as the row change it describes, per the plan's "Rules"
 * section ("Every status transition happens in a transaction and writes a
 * membership_event").
 */
export function createMembershipEventRepository(db: Db) {
  return {
    async record(input: RecordEventInput) {
      return firstOrThrow(
        await db
          .insert(membershipEvent)
          .values({
            eventType: input.eventType,
            targetUserId: input.targetUserId,
            actorId: input.actorId ?? null,
            campaignId: input.campaignId ?? null,
            details: input.details ?? null,
          })
          .returning(),
      );
    },

    /** "Events by member" — the full audit trail for one user, newest first. */
    async listForUser(targetUserId: string) {
      return db
        .select()
        .from(membershipEvent)
        .where(eq(membershipEvent.targetUserId, targetUserId))
        .orderBy(desc(membershipEvent.createdAt));
    },
  };
}

export type MembershipEventRepository = ReturnType<
  typeof createMembershipEventRepository
>;

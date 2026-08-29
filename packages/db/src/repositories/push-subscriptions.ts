import { and, eq } from "drizzle-orm";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { pushSubscription } from "../schema/push-subscription";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface SavePushSubscriptionInput {
  userId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  userAgent?: string | null;
}

export interface StoredPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
}

function toStored(row: {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): StoredPushSubscription {
  return {
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
}

/**
 * Storage for browser web-push subscriptions (IA — admin PWA). The endpoint is
 * the natural key: re-subscribing the same browser must update the keys in
 * place, not stack a second row, and a dead endpoint is deleted on the first
 * failed send.
 */
export function createPushSubscriptionRepository(db: Db) {
  return {
    /** Upsert by endpoint. Re-subscribing rotates the encryption keys. */
    async save(
      input: SavePushSubscriptionInput,
    ): Promise<StoredPushSubscription> {
      const [row] = await db
        .insert(pushSubscription)
        .values({
          userId: input.userId,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent ?? null,
        })
        .onConflictDoUpdate({
          target: pushSubscription.endpoint,
          set: {
            userId: input.userId,
            p256dh: input.keys.p256dh,
            auth: input.keys.auth,
            userAgent: input.userAgent ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();
      return toStored(row!);
    },

    /** Idempotent: unsubscribing an endpoint that is already gone is fine. */
    async deleteByEndpoint(endpoint: string): Promise<void> {
      await db
        .delete(pushSubscription)
        .where(eq(pushSubscription.endpoint, endpoint));
    },

    async deleteByEndpointForUser(
      userId: string,
      endpoint: string,
    ): Promise<void> {
      await db
        .delete(pushSubscription)
        .where(
          and(
            eq(pushSubscription.userId, userId),
            eq(pushSubscription.endpoint, endpoint),
          ),
        );
    },

    async listForUser(userId: string): Promise<StoredPushSubscription[]> {
      const rows = await db
        .select()
        .from(pushSubscription)
        .where(eq(pushSubscription.userId, userId));
      return rows.map(toStored);
    },

    /**
     * Every subscription whose owner is currently an admin. The join is the
     * authorization check: demote someone and their devices stop receiving
     * the committee's notifications without anyone pruning rows.
     */
    async listForAdmins(): Promise<StoredPushSubscription[]> {
      const rows = await db
        .select({
          id: pushSubscription.id,
          userId: pushSubscription.userId,
          endpoint: pushSubscription.endpoint,
          p256dh: pushSubscription.p256dh,
          auth: pushSubscription.auth,
        })
        .from(pushSubscription)
        .innerJoin(user, eq(user.id, pushSubscription.userId))
        .where(eq(user.role, "admin"));
      return rows.map(toStored);
    },
  };
}

export type PushSubscriptionRepository = ReturnType<
  typeof createPushSubscriptionRepository
>;

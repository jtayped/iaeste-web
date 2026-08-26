import { and, eq, gt, isNull, sql } from "drizzle-orm";

import type { Db } from "../client";
import { registrationVerification } from "../schema/registration-verification";
import { IllegalTransitionError } from "./errors";
import { firstOrThrow } from "./util";

export interface CreateVerificationInput {
  registrationId: string;
  tokenHash: string;
  expiresAt: Date;
}

export function createRegistrationVerificationRepository(db: Db) {
  return {
    async create(input: CreateVerificationInput) {
      return firstOrThrow(
        await db.insert(registrationVerification).values(input).returning(),
      );
    },

    async getByTokenHash(tokenHash: string) {
      const [row] = await db
        .select()
        .from(registrationVerification)
        .where(eq(registrationVerification.tokenHash, tokenHash));
      return row;
    },

    /**
     * Marks the token used, but only if it was not already used and has not
     * expired — a compare-and-set `UPDATE ... WHERE consumed_at is null and
     * expires_at > now()`. If two requests race to consume the same token,
     * at most one `UPDATE` finds a matching row to return.
     */
    async consume(tokenHash: string) {
      const [row] = await db
        .update(registrationVerification)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(registrationVerification.tokenHash, tokenHash),
            isNull(registrationVerification.consumedAt),
            gt(registrationVerification.expiresAt, new Date()),
          ),
        )
        .returning();

      if (!row) {
        throw new IllegalTransitionError(
          "Verification token is invalid, expired, or already used",
        );
      }

      return row;
    },

    /**
     * Expires every not-yet-consumed verification row for a registration by
     * setting `expiresAt` to now. Used when resending a verification email
     * (IA-40) so the previous token stops working immediately instead of
     * staying valid until its original expiry — `consume()`'s
     * `expiresAt > now()` check then rejects it on the next attempt.
     */
    async invalidateActiveForRegistration(registrationId: string) {
      await db
        .update(registrationVerification)
        .set({ expiresAt: new Date() })
        .where(
          and(
            eq(registrationVerification.registrationId, registrationId),
            isNull(registrationVerification.consumedAt),
          ),
        );
    },

    async recordAttempt(id: string) {
      await db
        .update(registrationVerification)
        .set({
          attemptCount: sql`${registrationVerification.attemptCount} + 1`,
          lastAttemptAt: new Date(),
        })
        .where(eq(registrationVerification.id, id));
    },
  };
}

export type RegistrationVerificationRepository = ReturnType<
  typeof createRegistrationVerificationRepository
>;

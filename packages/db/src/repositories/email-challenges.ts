import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import type { Db } from "../client";
import { emailChallenge } from "../schema/email-challenge";
import { firstOrThrow } from "./util";

export interface CreateChallengeInput {
  email: string;
  codeHash: string;
  expiresAt: Date;
}

export interface ConsumeChallengeInput {
  sessionTokenHash: string;
  sessionExpiresAt: Date;
}

/** Wrong codes tolerated before a challenge is dead and a new one is needed. */
export const MAX_CHALLENGE_ATTEMPTS = 5;

export function createEmailChallengeRepository(db: Db) {
  return {
    /**
     * Issues a fresh challenge, retiring any the address still has open.
     *
     * Retiring first is what stops a resend from widening the guessing
     * window: two live codes for one address would double an attacker's
     * chances per attempt and leave the older one usable after the person
     * has already moved on to the newer email.
     */
    async create(input: CreateChallengeInput) {
      await db
        .update(emailChallenge)
        .set({ expiresAt: new Date() })
        .where(
          and(
            eq(emailChallenge.email, input.email),
            isNull(emailChallenge.consumedAt),
          ),
        );

      return firstOrThrow(
        await db.insert(emailChallenge).values(input).returning(),
      );
    },

    /** The newest unconsumed, unexpired challenge for an address, if any. */
    async getActive(email: string) {
      const [row] = await db
        .select()
        .from(emailChallenge)
        .where(
          and(
            eq(emailChallenge.email, email),
            isNull(emailChallenge.consumedAt),
            gt(emailChallenge.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(emailChallenge.createdAt))
        .limit(1);
      return row;
    },

    /** A wrong guess. Counted so `MAX_CHALLENGE_ATTEMPTS` can end the challenge. */
    async recordAttempt(id: string) {
      const [row] = await db
        .update(emailChallenge)
        .set({ attemptCount: sql`${emailChallenge.attemptCount} + 1` })
        .where(eq(emailChallenge.id, id))
        .returning();
      return row;
    },

    /** Retires a challenge without issuing a session — too many wrong guesses. */
    async burn(id: string) {
      await db
        .update(emailChallenge)
        .set({ expiresAt: new Date() })
        .where(eq(emailChallenge.id, id));
    },

    /**
     * Trades the right code for a session token, as a compare-and-set on
     * "still unconsumed and still in date". Two requests racing with the
     * same correct code produce one session, not two.
     */
    async consume(id: string, input: ConsumeChallengeInput) {
      const [row] = await db
        .update(emailChallenge)
        .set({
          consumedAt: new Date(),
          sessionTokenHash: input.sessionTokenHash,
          sessionExpiresAt: input.sessionExpiresAt,
        })
        .where(
          and(
            eq(emailChallenge.id, id),
            isNull(emailChallenge.consumedAt),
            gt(emailChallenge.expiresAt, new Date()),
          ),
        )
        .returning();
      return row;
    },

    /** The address a live session token stands for, or undefined. */
    async getSession(sessionTokenHash: string) {
      const [row] = await db
        .select()
        .from(emailChallenge)
        .where(
          and(
            eq(emailChallenge.sessionTokenHash, sessionTokenHash),
            isNull(emailChallenge.sessionConsumedAt),
            gt(emailChallenge.sessionExpiresAt, new Date()),
          ),
        );
      return row;
    },

    /**
     * Spends the session, returning the row only if this call is the one
     * that spent it. The registration write is guarded by this, so a
     * double-submitted form cannot produce two registrations.
     */
    async consumeSession(sessionTokenHash: string) {
      const [row] = await db
        .update(emailChallenge)
        .set({ sessionConsumedAt: new Date() })
        .where(
          and(
            eq(emailChallenge.sessionTokenHash, sessionTokenHash),
            isNull(emailChallenge.sessionConsumedAt),
            gt(emailChallenge.sessionExpiresAt, new Date()),
          ),
        )
        .returning();
      return row;
    },
  };
}

export type EmailChallengeRepository = ReturnType<
  typeof createEmailChallengeRepository
>;

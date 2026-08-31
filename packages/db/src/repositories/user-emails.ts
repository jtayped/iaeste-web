import { and, eq, inArray, isNotNull } from "drizzle-orm";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { userEmail } from "../schema/user-email";

export function createUserEmailRepository(db: Db) {
  return {
    async resolveVerified(rawEmail: string) {
      const email = rawEmail.trim().toLowerCase();
      const [row] = await db
        .select({
          userId: userEmail.userId,
          email: userEmail.email,
          canonicalEmail: user.email,
        })
        .from(userEmail)
        .innerJoin(user, eq(user.id, userEmail.userId))
        .where(
          and(eq(userEmail.email, email), isNotNull(userEmail.verifiedAt)),
        );
      return row;
    },

    async findUsersForAddresses(rawEmails: readonly string[]) {
      const emails = rawEmails.map((email) => email.trim().toLowerCase());
      if (emails.length === 0) return [];
      return db
        .select({ userId: userEmail.userId, email: userEmail.email })
        .from(userEmail)
        .where(inArray(userEmail.email, emails));
    },
  };
}

export type UserEmailRepository = ReturnType<typeof createUserEmailRepository>;

import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { userEmail, type MemberEmailKind } from "../schema/user-email";
import {
  DuplicateEmailSlotsError,
  EmailAddressInUseError,
  LastEmailRemovalError,
} from "./errors";

/** One stored address for a member, in the shape the admin fitxa renders. */
export interface UserEmailRow {
  email: string;
  verifiedAt: Date | null;
}

/** Both slots for one member; either may be absent. */
export interface UserEmails {
  university: UserEmailRow | null;
  personal: UserEmailRow | null;
}

/**
 * A change to one member's addresses. A key set to a string sets/replaces
 * that slot; a key set to `null` clears it; an absent key is left untouched.
 */
export type UserEmailChanges = Partial<Record<MemberEmailKind, string | null>>;

const KINDS: readonly MemberEmailKind[] = ["university", "personal"];

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function toUserEmails(
  rows: readonly {
    kind: MemberEmailKind;
    email: string;
    verifiedAt: Date | null;
  }[],
): UserEmails {
  const find = (kind: MemberEmailKind) => {
    const row = rows.find((r) => r.kind === kind);
    return row ? { email: row.email, verifiedAt: row.verifiedAt } : null;
  };
  return { university: find("university"), personal: find("personal") };
}

export function createUserEmailRepository(db: Db) {
  return {
    async resolveVerified(rawEmail: string) {
      const email = normalise(rawEmail);
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
      const emails = rawEmails.map(normalise);
      if (emails.length === 0) return [];
      return db
        .select({ userId: userEmail.userId, email: userEmail.email })
        .from(userEmail)
        .where(inArray(userEmail.email, emails));
    },

    /** Both stored addresses for one member, university and personal. */
    async listForUser(userId: string): Promise<UserEmails> {
      const rows = await db
        .select({
          kind: userEmail.kind,
          email: userEmail.email,
          verifiedAt: userEmail.verifiedAt,
        })
        .from(userEmail)
        .where(eq(userEmail.userId, userId));
      return toUserEmails(rows);
    },

    /**
     * Set, replace or clear a member's university / personal addresses from
     * the admin fitxa. An admin edit is trusted: a set address is stored
     * already verified (`verifiedAt = now()`), so the member can sign in with
     * it immediately — no confirmation link.
     *
     * Rules enforced here, in one transaction:
     * - the edit may not leave the member with zero addresses;
     * - an address already linked to another account is rejected
     *   (`EmailAddressInUseError`) rather than hitting the unique index;
     * - `user.email` (the Better Auth canonical column, shown in the member
     *   list) is re-pointed at the personal address if there is one, else the
     *   university one, and marked verified.
     */
    async setForUser(
      userId: string,
      changes: UserEmailChanges,
    ): Promise<UserEmails> {
      const normalised: UserEmailChanges = {};
      for (const kind of KINDS) {
        if (!(kind in changes)) continue;
        const raw = changes[kind];
        normalised[kind] = raw == null ? null : normalise(raw);
      }

      return db.transaction(async (tx) => {
        const current = await tx
          .select({
            kind: userEmail.kind,
            email: userEmail.email,
            verifiedAt: userEmail.verifiedAt,
          })
          .from(userEmail)
          .where(eq(userEmail.userId, userId));

        // The state the edit would leave behind, per slot.
        const next = new Map<MemberEmailKind, string>();
        for (const row of current) next.set(row.kind, row.email);
        for (const kind of KINDS) {
          if (!(kind in normalised)) continue;
          const value = normalised[kind];
          if (value == null) next.delete(kind);
          else next.set(kind, value);
        }

        if (next.size === 0) throw new LastEmailRemovalError();
        if (new Set(next.values()).size !== next.size) {
          throw new DuplicateEmailSlotsError();
        }

        // Every address being set, checked against other accounts before we
        // touch the unique index.
        const setAddresses = [...next.values()];
        const [aliasClashes, canonicalClashes] = await Promise.all([
          tx
            .select({ email: userEmail.email })
            .from(userEmail)
            .where(
              and(
                inArray(userEmail.email, setAddresses),
                ne(userEmail.userId, userId),
              ),
            ),
          tx
            .select({ email: user.email })
            .from(user)
            .where(and(inArray(user.email, setAddresses), ne(user.id, userId))),
        ]);
        const clash = aliasClashes[0]?.email ?? canonicalClashes[0]?.email;
        if (clash) throw new EmailAddressInUseError(clash);

        const changedKinds = KINDS.filter((kind) => kind in normalised);

        // Clear every changed slot before inserting replacements. This makes
        // an atomic university ↔ personal swap possible despite the global
        // unique index on `user_email.email`; updating one row at a time would
        // collide with the other row before it had moved.
        if (changedKinds.length > 0) {
          await tx
            .delete(userEmail)
            .where(
              and(
                eq(userEmail.userId, userId),
                inArray(userEmail.kind, changedKinds),
              ),
            );
        }

        const now = new Date();
        for (const kind of changedKinds) {
          const value = normalised[kind];
          if (value == null) continue;
          await tx
            .insert(userEmail)
            .values({ userId, email: value, kind, verifiedAt: now });
        }

        const canonical = next.get("personal") ?? next.get("university");
        if (canonical) {
          await tx
            .update(user)
            .set({ email: canonical, emailVerified: true, updatedAt: now })
            .where(eq(user.id, userId));
        }

        const rows = await tx
          .select({
            kind: userEmail.kind,
            email: userEmail.email,
            verifiedAt: userEmail.verifiedAt,
          })
          .from(userEmail)
          .where(eq(userEmail.userId, userId));
        return toUserEmails(rows);
      });
    },
  };
}

export type UserEmailRepository = ReturnType<typeof createUserEmailRepository>;

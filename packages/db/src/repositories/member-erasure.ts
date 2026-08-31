import { eq, inArray, sql } from "drizzle-orm";

import type { Database } from "../client";
import { account, session, user, verification } from "../schema/auth";
import { emailChallenge } from "../schema/email-challenge";
import { memberInvitation } from "../schema/member-invitation";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import { membershipEvent } from "../schema/membership-event";
import { pushSubscription } from "../schema/push-subscription";
import { registration } from "../schema/registration";
import { registrationVerification } from "../schema/registration-verification";
import { NotFoundError } from "./errors";

/** Per-table row counts removed by {@link MemberErasureRepository.eraseUser}. */
export interface EraseUserCounts {
  /** `registration` rows matched by the user's email address. */
  registrations: number;
  /** `registration_verification` rows under those registrations. */
  registrationVerifications: number;
  /** `email_challenge` rows matched by the user's email address. */
  emailChallenges: number;
  /** Better Auth `verification` rows (magic-link tokens) for that email. */
  authVerifications: number;
  /** `member_invitation` rows this user sent. */
  memberInvitations: number;
  /** `membership_event` rows where this user is the target. */
  membershipEvents: number;
  /** `membership` rows belonging to this user. */
  memberships: number;
  /** `push_subscription` rows belonging to this user. */
  pushSubscriptions: number;
  /** `session` rows belonging to this user. */
  sessions: number;
  /** `account` rows belonging to this user. */
  accounts: number;
  /** `member_profile` row for this user (0 or 1). */
  memberProfile: number;
}

export interface EraseUserResult {
  userId: string;
  email: string;
  deleted: EraseUserCounts;
}

/**
 * Irreversible, total erasure of one person.
 *
 * This is deliberately NOT the `leave` / `kick` ("donar de baixa") flow in
 * `memberships.ts`: that ends a membership but keeps the `user`,
 * `member_profile`, every past `membership` row and the whole
 * `membership_event` audit trail, because the committee's history still
 * refers to that person. `eraseUser` is the opposite — it removes the
 * account and every row that is *about* that person, for a real "delete my
 * data" request. Both coexist; an admin picks one.
 *
 * What is removed, in foreign-key-safe order, all inside one transaction:
 *
 *   - `registration` (matched on the user's email — registrations are keyed
 *     by address, not by a user FK) and, cascading from it via
 *     `registration_verification.registration_id`'s `ON DELETE CASCADE`, its
 *     verification attempts. Deleted explicitly here too so the count is
 *     exact.
 *   - `email_challenge` for that address.
 *   - Better Auth `verification` rows for that address. The magic-link
 *     plugin stores a hashed token in `identifier` and the address inside
 *     the JSON `value`, so these are matched by a plain substring test on
 *     `value` (no `LIKE`, so an underscore or percent in the address cannot
 *     widen the match). Best effort: these rows expire in minutes anyway.
 *   - `member_invitation` this user sent (`inviter_id`, `ON DELETE
 *     RESTRICT`).
 *   - `membership_event` where this user is the `target_user_id`
 *     (`ON DELETE RESTRICT`). Rows where they were only the `actor_id` are
 *     left in place with `actor_id` nulled by that column's `ON DELETE SET
 *     NULL` — those rows are another member's audit trail, not this
 *     person's data.
 *   - `membership` rows (`user_id`, `ON DELETE RESTRICT`).
 *   - `push_subscription`, `member_profile`, `session`, `account` — every
 *     one of these already has `ON DELETE CASCADE` on its `user_id`, so
 *     deleting `user` alone would clear them; they are deleted explicitly
 *     first only so the returned counts are precise.
 *   - `registration.reviewer_id` (`ON DELETE SET NULL`) is nulled by the
 *     final `user` delete, keeping the reviewed registration intact.
 *   - Finally the `user` row itself.
 */
export function createMemberErasureRepository(db: Database) {
  return {
    async eraseUser(userId: string): Promise<EraseUserResult> {
      return db.transaction(async (tx) => {
        const [target] = await tx
          .select({ id: user.id, email: user.email })
          .from(user)
          .where(eq(user.id, userId));

        if (!target) {
          throw new NotFoundError(`No user with id ${userId}`);
        }

        const email = target.email.trim().toLowerCase();

        const registrationRows = await tx
          .select({ id: registration.id })
          .from(registration)
          .where(eq(registration.email, email));
        const registrationIds = registrationRows.map((row) => row.id);

        let registrationVerifications = 0;
        let registrations = 0;
        if (registrationIds.length > 0) {
          const rv = await tx
            .delete(registrationVerification)
            .where(
              inArray(registrationVerification.registrationId, registrationIds),
            )
            .returning({ id: registrationVerification.id });
          registrationVerifications = rv.length;

          const rg = await tx
            .delete(registration)
            .where(inArray(registration.id, registrationIds))
            .returning({ id: registration.id });
          registrations = rg.length;
        }

        const emailChallenges = await tx
          .delete(emailChallenge)
          .where(eq(emailChallenge.email, email))
          .returning({ id: emailChallenge.id });

        const emailFragment = `"email":"${email}"`;
        const authVerifications = await tx
          .delete(verification)
          .where(sql`position(${emailFragment} in ${verification.value}) > 0`)
          .returning({ id: verification.id });

        const memberInvitations = await tx
          .delete(memberInvitation)
          .where(eq(memberInvitation.inviterId, userId))
          .returning({ id: memberInvitation.id });

        const membershipEvents = await tx
          .delete(membershipEvent)
          .where(eq(membershipEvent.targetUserId, userId))
          .returning({ id: membershipEvent.id });

        const memberships = await tx
          .delete(membership)
          .where(eq(membership.userId, userId))
          .returning({ id: membership.id });

        const pushSubscriptions = await tx
          .delete(pushSubscription)
          .where(eq(pushSubscription.userId, userId))
          .returning({ id: pushSubscription.id });

        const memberProfileRows = await tx
          .delete(memberProfile)
          .where(eq(memberProfile.userId, userId))
          .returning({ userId: memberProfile.userId });

        const sessions = await tx
          .delete(session)
          .where(eq(session.userId, userId))
          .returning({ id: session.id });

        const accounts = await tx
          .delete(account)
          .where(eq(account.userId, userId))
          .returning({ id: account.id });

        await tx.delete(user).where(eq(user.id, userId));

        return {
          userId,
          email,
          deleted: {
            registrations,
            registrationVerifications,
            emailChallenges: emailChallenges.length,
            authVerifications: authVerifications.length,
            memberInvitations: memberInvitations.length,
            membershipEvents: membershipEvents.length,
            memberships: memberships.length,
            pushSubscriptions: pushSubscriptions.length,
            sessions: sessions.length,
            accounts: accounts.length,
            memberProfile: memberProfileRows.length,
          },
        };
      });
    },
  };
}

export type MemberErasureRepository = ReturnType<
  typeof createMemberErasureRepository
>;

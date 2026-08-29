import { and, eq, gt, sql } from "drizzle-orm";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { memberInvitation } from "../schema/member-invitation";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import { registration } from "../schema/registration";
import { createMembershipEventRepository } from "./membership-events";
import { createMembershipRepository } from "./memberships";
import { IllegalTransitionError, NotFoundError } from "./errors";
import { firstOrThrow } from "./util";
import type {
  AcceptInvitationInput,
  AcceptInvitationResult,
} from "./invitations";

/**
 * The onboarding transaction, factored out of the invitations repository so
 * that file stays under the line limit.
 *
 * Consumes the invitation (compare-and-set on
 * `status = 'pending' AND expires_at > now()`, so an expired link cannot be
 * redeemed and two concurrent accepts produce one membership), then, in the
 * same `tx`:
 *   - creates or reuses the `user`, applying `intendedRole`;
 *   - upserts `member_profile` from the submitted form;
 *   - reconciles the annual `registration` snapshot (insert / reuse a pending
 *     row / override a rejected row / leave an accepted one);
 *   - joins the membership, unless one already exists.
 *
 * `tx` must be a transaction handle — the caller wraps it in
 * `db.transaction(...)`.
 */
export async function acceptInvitationTx(
  tx: Db,
  invitationId: string,
  input: AcceptInvitationInput,
): Promise<AcceptInvitationResult> {
  const [invitation] = await tx
    .update(memberInvitation)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(
      and(
        eq(memberInvitation.id, invitationId),
        eq(memberInvitation.status, "pending"),
        gt(memberInvitation.expiresAt, sql`now()`),
      ),
    )
    .returning();

  if (!invitation) throw await illegalOrMissing(tx, invitationId);

  const now = new Date();
  const fullName = `${input.profile.name} ${input.profile.surnames}`.trim();

  const [existingUser] = await tx
    .select()
    .from(user)
    .where(eq(user.email, invitation.email));

  const memberUser = existingUser
    ? firstOrThrow(
        await tx
          .update(user)
          .set({ role: invitation.intendedRole })
          .where(eq(user.id, existingUser.id))
          .returning(),
      )
    : firstOrThrow(
        await tx
          .insert(user)
          .values({
            id: crypto.randomUUID(),
            name: fullName,
            email: invitation.email,
            emailVerified: true,
            role: invitation.intendedRole,
          })
          .returning(),
      );

  await tx
    .insert(memberProfile)
    .values({
      userId: memberUser.id,
      name: input.profile.name,
      surnames: input.profile.surnames,
      phoneE164: input.profile.phoneE164,
      phoneDisplay: input.profile.phoneDisplay,
      degree: input.profile.degree,
      studyYear: input.profile.studyYear,
    })
    .onConflictDoUpdate({
      target: memberProfile.userId,
      set: {
        name: input.profile.name,
        surnames: input.profile.surnames,
        phoneE164: input.profile.phoneE164,
        phoneDisplay: input.profile.phoneDisplay,
        degree: input.profile.degree,
        studyYear: input.profile.studyYear,
      },
    });

  // --- reconcile the annual registration snapshot ----------------------
  const [existingReg] = await tx
    .select()
    .from(registration)
    .where(
      and(
        eq(registration.campaignId, invitation.campaignId),
        eq(registration.email, invitation.email),
      ),
    );

  let registrationOutcome: AcceptInvitationResult["registrationOutcome"];
  if (!existingReg) {
    await tx.insert(registration).values({
      campaignId: invitation.campaignId,
      email: invitation.email,
      profileSnapshot: input.profile,
      source: "invitation",
      status: "accepted",
      verifiedAt: now,
      reviewedAt: now,
      reviewerId: invitation.inviterId,
    });
    registrationOutcome = "inserted";
  } else if (existingReg.status === "accepted") {
    registrationOutcome = "unchanged";
  } else {
    const wasRejected = existingReg.status === "rejected";
    await tx
      .update(registration)
      .set({
        profileSnapshot: input.profile,
        source: "invitation",
        status: "accepted",
        verifiedAt: now,
        reviewedAt: now,
        reviewerId: invitation.inviterId,
        rejectionReason: null,
      })
      .where(eq(registration.id, existingReg.id));
    registrationOutcome = wasRejected ? "override" : "reused";
  }

  // --- membership -----------------------------------------------------
  const events = createMembershipEventRepository(tx);
  const [existingMembership] = await tx
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.userId, memberUser.id),
        eq(membership.campaignId, invitation.campaignId),
      ),
    );

  if (registrationOutcome === "override") {
    await events.record({
      eventType: "role_changed",
      targetUserId: memberUser.id,
      actorId: invitation.inviterId,
      campaignId: invitation.campaignId,
      details: {
        note: "invitation accepted after a prior rejection",
      },
    });
  }

  if (existingMembership) {
    return {
      invitation,
      user: memberUser,
      membershipId: existingMembership.id,
      alreadyMember: existingMembership.status === "active",
      registrationOutcome,
    };
  }

  const memberships = createMembershipRepository(tx);
  const membershipRow = await memberships.join({
    userId: memberUser.id,
    campaignId: invitation.campaignId,
    source: "invitation",
    actorId: invitation.inviterId,
  });

  return {
    invitation,
    user: memberUser,
    membershipId: membershipRow.id,
    alreadyMember: false,
    registrationOutcome,
  };
}

/**
 * The error a compare-and-set on a `pending` invitation should throw when it
 * matches no row: `NotFoundError` if the id is unknown, `IllegalTransitionError`
 * if it exists but is expired or no longer pending. Shared by `accept`,
 * `cancel` and `rotateToken`.
 */
export async function illegalOrMissing(db: Db, invitationId: string) {
  const [row] = await db
    .select()
    .from(memberInvitation)
    .where(eq(memberInvitation.id, invitationId));
  if (!row) return new NotFoundError(`No invitation with id ${invitationId}`);
  if (row.status === "pending" && row.expiresAt.getTime() < Date.now()) {
    return new IllegalTransitionError(`Invitation ${invitationId} has expired`);
  }
  return new IllegalTransitionError(
    `Cannot transition invitation ${invitationId}: expected status pending, found ${row.status}`,
  );
}

import { and, eq, lt } from "drizzle-orm";

import type { Database, Db } from "../client";
import {
  memberInvitation,
  type memberInvitationRoleEnum,
  type memberInvitationStatusEnum,
} from "../schema/member-invitation";
import { user } from "../schema/auth";
import { memberProfile } from "../schema/member-profile";
import { createMembershipRepository } from "./memberships";
import { IllegalTransitionError, NotFoundError } from "./errors";
import { firstOrThrow } from "./util";
import type { RegistrationProfileSnapshot } from "./registrations";

export type InvitationStatus =
  (typeof memberInvitationStatusEnum.enumValues)[number];
export type InvitationRole =
  (typeof memberInvitationRoleEnum.enumValues)[number];

export interface CreateInvitationInput {
  campaignId: string;
  email: string;
  inviterId: string;
  intendedRole?: InvitationRole;
  tokenHash: string;
  expiresAt: Date;
}

export interface AcceptInvitationInput {
  profile: RegistrationProfileSnapshot;
}

export function createInvitationRepository(db: Database) {
  return {
    async create(input: CreateInvitationInput) {
      return firstOrThrow(
        await db
          .insert(memberInvitation)
          .values({
            campaignId: input.campaignId,
            email: input.email.toLowerCase(),
            inviterId: input.inviterId,
            intendedRole: input.intendedRole ?? "member",
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
          })
          .returning(),
      );
    },

    async getByTokenHash(tokenHash: string) {
      const [row] = await db
        .select()
        .from(memberInvitation)
        .where(eq(memberInvitation.tokenHash, tokenHash));
      return row;
    },

    async cancel(invitationId: string) {
      const [row] = await db
        .update(memberInvitation)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(memberInvitation.id, invitationId),
            eq(memberInvitation.status, "pending"),
          ),
        )
        .returning();

      if (!row) throw await illegalOrMissing(db, invitationId);
      return row;
    },

    /** Pending invitations already past `expiresAt` — never a stored state, see `member-invitation.ts`. */
    async listExpired(now: Date = new Date()) {
      return db
        .select()
        .from(memberInvitation)
        .where(
          and(
            eq(memberInvitation.status, "pending"),
            lt(memberInvitation.expiresAt, now),
          ),
        );
    },

    /**
     * Proving control of the invited address plus completing the profile
     * creates the membership directly, no second review (see
     * docs/membership-lifecycle.md question 8). Same shape as
     * `registrations.ts`'s `accept`: one transaction creates/reuses the
     * `user`, upserts `member_profile`, and joins the membership.
     */
    async accept(invitationId: string, input: AcceptInvitationInput) {
      return db.transaction(async (tx) => {
        const [invitation] = await tx
          .update(memberInvitation)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(
            and(
              eq(memberInvitation.id, invitationId),
              eq(memberInvitation.status, "pending"),
            ),
          )
          .returning();

        if (!invitation) throw await illegalOrMissing(tx, invitationId);

        const [existingUser] = await tx
          .select()
          .from(user)
          .where(eq(user.email, invitation.email));

        const memberUser =
          existingUser ??
          firstOrThrow(
            await tx
              .insert(user)
              .values({
                id: crypto.randomUUID(),
                name: `${input.profile.name} ${input.profile.surnames}`.trim(),
                email: invitation.email,
                emailVerified: true,
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

        const memberships = createMembershipRepository(tx);
        const membershipRow = await memberships.join({
          userId: memberUser.id,
          campaignId: invitation.campaignId,
          source: "invitation",
          actorId: invitation.inviterId,
        });

        return { invitation, user: memberUser, membership: membershipRow };
      });
    },
  };
}

async function illegalOrMissing(db: Db, invitationId: string) {
  const [row] = await db
    .select()
    .from(memberInvitation)
    .where(eq(memberInvitation.id, invitationId));
  if (!row) return new NotFoundError(`No invitation with id ${invitationId}`);
  return new IllegalTransitionError(
    `Cannot transition invitation ${invitationId}: expected status pending, found ${row.status}`,
  );
}

export type InvitationRepository = ReturnType<
  typeof createInvitationRepository
>;

import { and, eq } from "drizzle-orm";

import type { Database, Db } from "../client";
import {
  registration,
  type registrationStatusEnum,
} from "../schema/registration";
import { user } from "../schema/auth";
import { memberProfile } from "../schema/member-profile";
import { createMembershipRepository } from "./memberships";
import { IllegalTransitionError, NotFoundError } from "./errors";
import { firstOrThrow } from "./util";

export type RegistrationStatus =
  (typeof registrationStatusEnum.enumValues)[number];

/** The form as submitted — see `registration.profileSnapshot`'s column comment. */
export interface RegistrationProfileSnapshot {
  name: string;
  surnames: string;
  phoneE164: string;
  phoneDisplay: string;
  degree: string;
  studyYear: number;
  previousMember?: boolean;
  note?: string;
}

export interface CreateRegistrationInput {
  campaignId: string;
  email: string;
  profileSnapshot: RegistrationProfileSnapshot;
  source?: string;
  verificationExpiresAt?: Date;
}

export interface AcceptRegistrationInput {
  reviewerId: string;
  membershipSource?: string;
}

export interface RejectRegistrationInput {
  reviewerId: string;
  reason: string;
}

export function createRegistrationRepository(db: Database) {
  return {
    async create(input: CreateRegistrationInput) {
      return firstOrThrow(
        await db
          .insert(registration)
          .values({
            campaignId: input.campaignId,
            email: input.email.toLowerCase(),
            profileSnapshot: input.profileSnapshot,
            source: input.source ?? "public_form",
            verificationExpiresAt: input.verificationExpiresAt ?? null,
          })
          .returning(),
      );
    },

    async getById(id: string) {
      const [row] = await db
        .select()
        .from(registration)
        .where(eq(registration.id, id));
      return row;
    },

    async getByCampaignAndEmail(campaignId: string, email: string) {
      const [row] = await db
        .select()
        .from(registration)
        .where(
          and(
            eq(registration.campaignId, campaignId),
            eq(registration.email, email.toLowerCase()),
          ),
        );
      return row;
    },

    /** Every registration for a campaign, regardless of status. */
    async listByCampaign(campaignId: string) {
      return db
        .select()
        .from(registration)
        .where(eq(registration.campaignId, campaignId));
    },

    async listByCampaignAndStatus(
      campaignId: string,
      status: RegistrationStatus,
    ) {
      return db
        .select()
        .from(registration)
        .where(
          and(
            eq(registration.campaignId, campaignId),
            eq(registration.status, status),
          ),
        );
    },

    /** Registrations still waiting on the applicant to click the email link. */
    async listPendingVerification() {
      return db
        .select()
        .from(registration)
        .where(eq(registration.status, "pending_email"));
    },

    /** `pending_email` -> `pending_review`, compare-and-set on status. */
    async markEmailVerified(registrationId: string) {
      const [row] = await db
        .update(registration)
        .set({ status: "pending_review", verifiedAt: new Date() })
        .where(
          and(
            eq(registration.id, registrationId),
            eq(registration.status, "pending_email"),
          ),
        )
        .returning();

      if (!row)
        throw await illegalOrMissing(db, registrationId, "pending_email");
      return row;
    },

    /** `pending_review` -> `rejected`, compare-and-set on status. */
    async reject(registrationId: string, input: RejectRegistrationInput) {
      const [row] = await db
        .update(registration)
        .set({
          status: "rejected",
          reviewedAt: new Date(),
          reviewerId: input.reviewerId,
          rejectionReason: input.reason,
        })
        .where(
          and(
            eq(registration.id, registrationId),
            eq(registration.status, "pending_review"),
          ),
        )
        .returning();

      if (!row)
        throw await illegalOrMissing(db, registrationId, "pending_review");
      return row;
    },

    /**
     * `pending_review` -> `accepted`, and — atomically, in the same
     * transaction — creates (or reuses, for a returning person) the Better
     * Auth `user` row, upserts `member_profile`, and joins the membership.
     * "Accepted" is a one-way door for the registration (see the migration
     * that adds the `no transition out of accepted` trigger) and, because
     * the status compare-and-set only lets one concurrent caller through,
     * this is also what stops two concurrent accept attempts on the same
     * registration from producing two `membership` rows.
     */
    async accept(registrationId: string, input: AcceptRegistrationInput) {
      return db.transaction(async (tx) => {
        const [accepted] = await tx
          .update(registration)
          .set({
            status: "accepted",
            reviewedAt: new Date(),
            reviewerId: input.reviewerId,
          })
          .where(
            and(
              eq(registration.id, registrationId),
              eq(registration.status, "pending_review"),
            ),
          )
          .returning();

        if (!accepted)
          throw await illegalOrMissing(tx, registrationId, "pending_review");

        const snapshot =
          accepted.profileSnapshot as RegistrationProfileSnapshot;

        const [existingUser] = await tx
          .select()
          .from(user)
          .where(eq(user.email, accepted.email));

        const memberUser =
          existingUser ??
          firstOrThrow(
            await tx
              .insert(user)
              .values({
                id: crypto.randomUUID(),
                name: `${snapshot.name} ${snapshot.surnames}`.trim(),
                email: accepted.email,
                emailVerified: true,
              })
              .returning(),
          );

        await tx
          .insert(memberProfile)
          .values({
            userId: memberUser.id,
            name: snapshot.name,
            surnames: snapshot.surnames,
            phoneE164: snapshot.phoneE164,
            phoneDisplay: snapshot.phoneDisplay,
            degree: snapshot.degree,
            studyYear: snapshot.studyYear,
          })
          .onConflictDoUpdate({
            target: memberProfile.userId,
            set: {
              name: snapshot.name,
              surnames: snapshot.surnames,
              phoneE164: snapshot.phoneE164,
              phoneDisplay: snapshot.phoneDisplay,
              degree: snapshot.degree,
              studyYear: snapshot.studyYear,
            },
          });

        const memberships = createMembershipRepository(tx);
        const membershipRow = await memberships.join({
          userId: memberUser.id,
          campaignId: accepted.campaignId,
          source: input.membershipSource ?? "registration",
          actorId: input.reviewerId,
        });

        return {
          registration: accepted,
          user: memberUser,
          membership: membershipRow,
        };
      });
    },
  };
}

async function illegalOrMissing(
  db: Db,
  registrationId: string,
  expectedStatus: RegistrationStatus,
) {
  const [row] = await db
    .select()
    .from(registration)
    .where(eq(registration.id, registrationId));
  if (!row)
    return new NotFoundError(`No registration with id ${registrationId}`);
  return new IllegalTransitionError(
    `Cannot transition registration ${registrationId}: expected status ${expectedStatus}, found ${row.status}`,
  );
}

export type RegistrationRepository = ReturnType<
  typeof createRegistrationRepository
>;

import { and, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";

import type { Database, Db } from "../client";
import {
  memberInvitation,
  type memberInvitationRoleEnum,
  type memberInvitationStatusEnum,
} from "../schema/member-invitation";
import { user } from "../schema/auth";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import { registration } from "../schema/registration";
import { createMembershipEventRepository } from "./membership-events";
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
  prefillName?: string | null;
  prefillSurnames?: string | null;
  tokenHash: string;
  expiresAt: Date;
}

export interface AcceptInvitationInput {
  profile: RegistrationProfileSnapshot;
}

export interface AcceptInvitationResult {
  invitation: typeof memberInvitation.$inferSelect;
  user: typeof user.$inferSelect;
  membershipId: string;
  /** True when the person already had an accepted membership — idempotent. */
  alreadyMember: boolean;
  /** How the annual `registration` snapshot was reconciled. */
  registrationOutcome: "inserted" | "reused" | "override" | "unchanged";
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
            prefillName: input.prefillName ?? null,
            prefillSurnames: input.prefillSurnames ?? null,
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

    async getById(invitationId: string) {
      const [row] = await db
        .select()
        .from(memberInvitation)
        .where(eq(memberInvitation.id, invitationId));
      return row;
    },

    /** Every invitation for a campaign, with `expired` computed at read time. */
    async listByCampaign(campaignId: string) {
      const rows = await db
        .select()
        .from(memberInvitation)
        .where(eq(memberInvitation.campaignId, campaignId))
        .orderBy(desc(memberInvitation.createdAt));
      const now = Date.now();
      return rows.map((row) => ({
        ...row,
        expired: row.status === "pending" && row.expiresAt.getTime() < now,
      }));
    },

    /**
     * The admin table query: one campaign, optional `q` (ILIKE over email and
     * the prefill name/surnames), optional status where `"expired"` means
     * `pending` past `expiresAt` (a computed state, never stored), newest
     * first, `limit`/`offset` paged, plus the unpaged `total`. All filtering
     * is in SQL.
     */
    async listPageForCampaign(params: {
      campaignId: string;
      q?: string;
      status?: "pending" | "accepted" | "cancelled" | "expired";
      limit: number;
      offset: number;
    }): Promise<{
      rows: ((typeof memberInvitation.$inferSelect) & { expired: boolean })[];
      total: number;
    }> {
      const nowSql = sql`now()`;
      const clauses = [eq(memberInvitation.campaignId, params.campaignId)];

      if (params.status === "expired") {
        clauses.push(eq(memberInvitation.status, "pending"));
        clauses.push(lt(memberInvitation.expiresAt, nowSql));
      } else if (params.status) {
        clauses.push(eq(memberInvitation.status, params.status));
      }

      const needle = params.q?.trim();
      if (needle) {
        const like = `%${needle}%`;
        const search = or(
          ilike(memberInvitation.email, like),
          ilike(memberInvitation.prefillName, like),
          ilike(memberInvitation.prefillSurnames, like),
        );
        if (search) clauses.push(search);
      }

      const where = and(...clauses);

      const [rows, [countRow]] = await Promise.all([
        db
          .select()
          .from(memberInvitation)
          .where(where)
          .orderBy(desc(memberInvitation.createdAt))
          .limit(params.limit)
          .offset(params.offset),
        db
          .select({ value: sql<number>`count(*)` })
          .from(memberInvitation)
          .where(where),
      ]);

      const now = Date.now();
      return {
        rows: rows.map((row) => ({
          ...row,
          expired:
            row.status === "pending" && row.expiresAt.getTime() < now,
        })),
        total: Number(countRow?.value ?? 0),
      };
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

    /**
     * IA-32 reinvite: rotate the token + expiry on the existing pending
     * row (never a second row). Compare-and-set on `status = 'pending'`.
     */
    async rotateToken(
      invitationId: string,
      input: { tokenHash: string; expiresAt: Date },
    ) {
      const [row] = await db
        .update(memberInvitation)
        .set({ tokenHash: input.tokenHash, expiresAt: input.expiresAt })
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

    /** Pending invitations already past `expiresAt` — never a stored state. */
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
     * The onboarding transaction. Consumes the invitation (compare-and-set
     * on `status = 'pending' AND expires_at > now()`, so an expired link
     * cannot be redeemed and two concurrent accepts produce one
     * membership), then in the same transaction:
     *   - creates or reuses the `user`, applying `intendedRole`;
     *   - upserts `member_profile` from the submitted form;
     *   - reconciles the annual `registration` snapshot (insert / reuse a
     *     pending row / override a rejected row / leave an accepted one);
     *   - joins the membership, unless one already exists.
     */
    async accept(
      invitationId: string,
      input: AcceptInvitationInput,
    ): Promise<AcceptInvitationResult> {
      return db.transaction(async (tx) => {
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
        const fullName =
          `${input.profile.name} ${input.profile.surnames}`.trim();

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

        // --- reconcile the annual registration snapshot -----------------
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

        // --- membership -----------------------------------------------
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
  if (row.status === "pending" && row.expiresAt.getTime() < Date.now()) {
    return new IllegalTransitionError(`Invitation ${invitationId} has expired`);
  }
  return new IllegalTransitionError(
    `Cannot transition invitation ${invitationId}: expected status pending, found ${row.status}`,
  );
}

export type InvitationRepository = ReturnType<
  typeof createInvitationRepository
>;

import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";

import type { Database } from "../client";
import {
  memberInvitation,
  type memberInvitationRoleEnum,
  type memberInvitationStatusEnum,
} from "../schema/member-invitation";
import { user } from "../schema/auth";
import { firstOrThrow } from "./util";
import { acceptInvitationTx, illegalOrMissing } from "./invitations-accept";
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
      rows: (typeof memberInvitation.$inferSelect & { expired: boolean })[];
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
          expired: row.status === "pending" && row.expiresAt.getTime() < now,
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
     * The onboarding transaction — implemented in `invitations-accept.ts` to
     * keep this file under the line limit. See `acceptInvitationTx` for the
     * full contract (expiry-checked compare-and-set, user/profile upsert,
     * registration-snapshot reconciliation, membership join).
     */
    async accept(
      invitationId: string,
      input: AcceptInvitationInput,
    ): Promise<AcceptInvitationResult> {
      return db.transaction((tx) =>
        acceptInvitationTx(tx, invitationId, input),
      );
    },
  };
}

export type InvitationRepository = ReturnType<
  typeof createInvitationRepository
>;

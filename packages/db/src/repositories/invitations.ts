import {
  and,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  lt,
  notInArray,
  or,
  sql,
} from "drizzle-orm";

import {
  INVITATION_DEFAULT_SORT,
  type InvitationSortKey,
  type SortDirection,
} from "@repo/constants/validators/admin-list";

import type { Database } from "../client";
import {
  memberInvitation,
  type memberInvitationRoleEnum,
  type memberInvitationStatusEnum,
} from "../schema/member-invitation";
import { user } from "../schema/auth";
import { firstOrThrow } from "./util";
import { nullsLast, orderTerms, type SortTerm } from "./sort";
import { acceptInvitationTx, illegalOrMissing } from "./invitations-accept";
import type { RegistrationProfileSnapshot } from "./registrations";

export type InvitationStatus =
  (typeof memberInvitationStatusEnum.enumValues)[number];
export type InvitationRole =
  (typeof memberInvitationRoleEnum.enumValues)[number];

/** The filters the invitations table applies, without the paging. */
export interface AdminInvitationFilters {
  campaignId: string;
  q?: string;
  status?: InvitationStatus | "expired";
}

/** Cross-page selection over the invitations table. See `RegistrationSelection`. */
export type InvitationSelection =
  | { mode: "ids"; invitationIds: string[] }
  | (AdminInvitationFilters & {
      mode: "all";
      excludedInvitationIds: string[];
    });

/**
 * The invitations table's SQL filter, shared by the paged list and by any
 * bulk action resolved against it, so a selection cannot mean a different set
 * of people than the table showed.
 */
function adminInvitationWhere(params: AdminInvitationFilters) {
  const clauses = [eq(memberInvitation.campaignId, params.campaignId)];

  if (params.status === "expired") {
    clauses.push(eq(memberInvitation.status, "pending"));
    clauses.push(lt(memberInvitation.expiresAt, sql`now()`));
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

  return and(...clauses);
}

/**
 * `expired` as SQL rather than as a `Date.now()` comparison after the query.
 *
 * The `expired` status *filter* has always been SQL (`expires_at < now()`),
 * while the flag on each row was computed in JavaScript afterwards. Two
 * clocks: an invitation that lapsed between the two showed a "pendent" badge
 * on the "caducades" tab. Now both read the database's `now()`.
 */
const invitationExpired = sql<boolean>`(
  ${memberInvitation.status} = 'pending'
    and ${memberInvitation.expiresAt} < now()
)`;

/** The status a reader actually sees, with `expired` folded in. */
const invitationEffectiveStatus = sql`case
  when ${invitationExpired} then 'expired'
  else ${memberInvitation.status}::text
end`;

/**
 * What each sort key orders by. Every column of the table is here.
 *
 * The prefill name is empty for most invitations — they are usually just an
 * address — so it sorts its blanks to the bottom either way round rather than
 * opening the reversed list with a screenful of "—".
 */
const INVITATION_SORTS: Record<InvitationSortKey, readonly SortTerm[]> = {
  email: [memberInvitation.email],
  name: [
    nullsLast(memberInvitation.prefillName),
    nullsLast(memberInvitation.prefillSurnames),
  ],
  status: [invitationEffectiveStatus],
  role: [memberInvitation.intendedRole],
  createdAt: [memberInvitation.createdAt],
  expiresAt: [memberInvitation.expiresAt],
};

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

    /** Every invitation for a campaign, with `expired` computed in SQL. */
    async listByCampaign(campaignId: string) {
      return db
        .select({
          ...getTableColumns(memberInvitation),
          expired: invitationExpired,
        })
        .from(memberInvitation)
        .where(eq(memberInvitation.campaignId, campaignId))
        .orderBy(desc(memberInvitation.createdAt), desc(memberInvitation.id));
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
      /** Defaults to newest first, the order this table has always had. */
      sort?: InvitationSortKey;
      dir?: SortDirection;
      limit: number;
      offset: number;
    }): Promise<{
      rows: (typeof memberInvitation.$inferSelect & { expired: boolean })[];
      total: number;
    }> {
      const where = adminInvitationWhere(params);

      const [rows, [countRow]] = await Promise.all([
        db
          .select({
            ...getTableColumns(memberInvitation),
            expired: invitationExpired,
          })
          .from(memberInvitation)
          .where(where)
          .orderBy(
            ...orderTerms(
              INVITATION_SORTS[params.sort ?? INVITATION_DEFAULT_SORT.key],
              params.dir ?? INVITATION_DEFAULT_SORT.dir,
              memberInvitation.id,
            ),
          )
          .limit(params.limit)
          .offset(params.offset),
        db
          .select({ value: sql<number>`count(*)` })
          .from(memberInvitation)
          .where(where),
      ]);

      return { rows, total: Number(countRow?.value ?? 0) };
    },

    /**
     * The invitations a cross-page selection actually names, newest first to
     * match the table's own order.
     */
    async resolveSelection(selection: InvitationSelection, limit: number) {
      const where =
        selection.mode === "ids"
          ? inArray(memberInvitation.id, selection.invitationIds)
          : and(
              adminInvitationWhere(selection),
              selection.excludedInvitationIds.length > 0
                ? notInArray(
                    memberInvitation.id,
                    selection.excludedInvitationIds,
                  )
                : undefined,
            );

      return db
        .select()
        .from(memberInvitation)
        .where(where)
        .orderBy(desc(memberInvitation.createdAt), desc(memberInvitation.id))
        .limit(limit);
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

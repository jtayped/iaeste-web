import { and, asc, eq, gt, ilike, ne, or, sql } from "drizzle-orm";

import type { Database } from "../client";
import { membership } from "../schema/membership";
import { registration } from "../schema/registration";
import {
  membershipCampaign,
  type membershipCampaignStateEnum,
} from "../schema/membership-campaign";
import { IllegalTransitionError, NotFoundError } from "./errors";
import { firstOrThrow } from "./util";

export type CampaignState =
  (typeof membershipCampaignStateEnum.enumValues)[number];

export interface CreateCampaignInput {
  slug: string;
  label: string;
  membershipStartsAt: Date;
  membershipEndsAt: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  state?: CampaignState;
}

export interface UpdateCampaignInput {
  label?: string;
  slug?: string;
  membershipStartsAt?: Date;
  membershipEndsAt?: Date;
  registrationOpensAt?: Date;
  registrationClosesAt?: Date;
}

export function createCampaignRepository(db: Database) {
  return {
    async create(input: CreateCampaignInput) {
      return firstOrThrow(
        await db.insert(membershipCampaign).values(input).returning(),
      );
    },

    async getBySlug(slug: string) {
      const [row] = await db
        .select()
        .from(membershipCampaign)
        .where(eq(membershipCampaign.slug, slug));
      return row;
    },

    async getById(id: string) {
      const [row] = await db
        .select()
        .from(membershipCampaign)
        .where(eq(membershipCampaign.id, id));
      return row;
    },

    /** The one row with `isCurrent`, if any. Never derives this from dates. */
    async getCurrent() {
      const [row] = await db
        .select()
        .from(membershipCampaign)
        .where(eq(membershipCampaign.isCurrent, true));
      return row;
    },

    /** The one row with `isRegistrationOpen`, if any. */
    async getOpenForRegistration() {
      const [row] = await db
        .select()
        .from(membershipCampaign)
        .where(eq(membershipCampaign.isRegistrationOpen, true));
      return row;
    },

    /**
     * The soonest published campaign whose registration window has not opened
     * yet. Unlike `getOpenForRegistration`, this one *does* read the
     * timestamps: no flag can identify a campaign that has not started, and
     * the public site needs a target to count down to. Draft campaigns are
     * excluded because they are still being configured, and archived ones
     * are done.
     */
    async getNextForRegistration() {
      const [row] = await db
        .select()
        .from(membershipCampaign)
        .where(
          and(
            eq(membershipCampaign.state, "published"),
            gt(membershipCampaign.registrationOpensAt, sql`now()`),
          ),
        )
        .orderBy(asc(membershipCampaign.registrationOpensAt))
        .limit(1);
      return row;
    },

    async list() {
      return db.select().from(membershipCampaign);
    },

    /**
     * Low-level flag setter — does not touch any other row. Exists so the
     * partial unique index (`membership_campaign_one_current`) is the thing
     * that decides whether a second campaign may become current, which is
     * exactly what the concurrency guarantee in IA-11 needs to be able to
     * test directly: two of these racing on different campaigns must let
     * exactly one through.
     */
    async setCurrent(campaignId: string) {
      const [row] = await db
        .update(membershipCampaign)
        .set({ isCurrent: true })
        .where(eq(membershipCampaign.id, campaignId))
        .returning();
      if (!row) throw new NotFoundError(`No campaign with id ${campaignId}`);
      return row;
    },

    async unsetCurrent(campaignId: string) {
      await db
        .update(membershipCampaign)
        .set({ isCurrent: false })
        .where(eq(membershipCampaign.id, campaignId));
    },

    async setRegistrationOpen(campaignId: string) {
      const [row] = await db
        .update(membershipCampaign)
        .set({ isRegistrationOpen: true })
        .where(eq(membershipCampaign.id, campaignId))
        .returning();
      if (!row) throw new NotFoundError(`No campaign with id ${campaignId}`);
      return row;
    },

    async unsetRegistrationOpen(campaignId: string) {
      await db
        .update(membershipCampaign)
        .set({ isRegistrationOpen: false })
        .where(eq(membershipCampaign.id, campaignId));
    },

    /**
     * The admin-facing operation: atomically move `isCurrent` from whatever
     * campaign has it (if any) to `campaignId`. Unlike `setCurrent`, this
     * clears every other row first so the end state always has at most one
     * current campaign — the partial unique index would reject this anyway
     * if it didn't, but clearing first means a normal "make this the
     * current campaign" admin action never has to retry.
     */
    async switchCurrent(campaignId: string) {
      return db.transaction(async (tx) => {
        await tx
          .update(membershipCampaign)
          .set({ isCurrent: false })
          .where(
            and(
              eq(membershipCampaign.isCurrent, true),
              ne(membershipCampaign.id, campaignId),
            ),
          );
        const [row] = await tx
          .update(membershipCampaign)
          .set({
            isCurrent: true,
            state: sql`case when ${membershipCampaign.state} = 'draft' then 'published' else ${membershipCampaign.state} end`,
          })
          .where(eq(membershipCampaign.id, campaignId))
          .returning();
        if (!row) throw new NotFoundError(`No campaign with id ${campaignId}`);
        return row;
      });
    },

    async switchRegistrationOpen(campaignId: string) {
      return db.transaction(async (tx) => {
        await tx
          .update(membershipCampaign)
          .set({ isRegistrationOpen: false })
          .where(
            and(
              eq(membershipCampaign.isRegistrationOpen, true),
              ne(membershipCampaign.id, campaignId),
            ),
          );
        const [row] = await tx
          .update(membershipCampaign)
          .set({
            isRegistrationOpen: true,
            state: sql`case when ${membershipCampaign.state} = 'draft' then 'published' else ${membershipCampaign.state} end`,
          })
          .where(eq(membershipCampaign.id, campaignId))
          .returning();
        if (!row) throw new NotFoundError(`No campaign with id ${campaignId}`);
        return row;
      });
    },

    /**
     * Draft editing. `slug` may only change while the campaign is still a
     * `draft` — once it is published the slug is its stable public
     * identifier (registration links, the Sheet tab). Date changes are
     * always allowed here; the admin UI is responsible for confirming them
     * when rows already exist.
     */
    async update(id: string, input: UpdateCampaignInput) {
      const existing = await this.getById(id);
      if (!existing) throw new NotFoundError(`No campaign with id ${id}`);
      if (
        input.slug !== undefined &&
        input.slug !== existing.slug &&
        existing.state !== "draft"
      ) {
        throw new IllegalTransitionError(
          `Cannot change the slug of a ${existing.state} campaign`,
        );
      }
      const patch: Record<string, unknown> = {};
      for (const key of [
        "label",
        "slug",
        "membershipStartsAt",
        "membershipEndsAt",
        "registrationOpensAt",
        "registrationClosesAt",
      ] as const) {
        if (input[key] !== undefined) patch[key] = input[key];
      }
      if (Object.keys(patch).length === 0) return existing;
      const [row] = await db
        .update(membershipCampaign)
        .set(patch)
        .where(eq(membershipCampaign.id, id))
        .returning();
      if (!row) throw new NotFoundError(`No campaign with id ${id}`);
      return row;
    },

    /**
     * Ends a campaign's administrative life. Never deletes — clears both
     * coexistence flags and moves `state` to `archived`. Idempotent.
     */
    async archive(id: string) {
      const [row] = await db
        .update(membershipCampaign)
        .set({ state: "archived", isCurrent: false, isRegistrationOpen: false })
        .where(eq(membershipCampaign.id, id))
        .returning();
      if (!row) throw new NotFoundError(`No campaign with id ${id}`);
      return row;
    },

    /** Every campaign plus its active-member and pending-review counts. */
    /**
     * Campaigns with their active-member and pending-review counts, newest
     * membership start first. Paginated and `q`/`state`-filterable in SQL so
     * the admin table has the same server-queried contract as the others,
     * even though the campaign set is inherently small.
     */
    async listWithCounts(
      params: {
        q?: string;
        state?: (typeof membershipCampaignStateEnum.enumValues)[number];
        limit: number;
        offset: number;
      } = { limit: 100, offset: 0 },
    ) {
      const clauses = [];
      if (params.state)
        clauses.push(eq(membershipCampaign.state, params.state));
      const needle = params.q?.trim();
      if (needle) {
        const like = `%${needle}%`;
        const search = or(
          ilike(membershipCampaign.slug, like),
          ilike(membershipCampaign.label, like),
        );
        if (search) clauses.push(search);
      }
      const where = clauses.length ? and(...clauses) : undefined;

      const [rows, [countRow]] = await Promise.all([
        db
          .select({
            campaign: membershipCampaign,
            activeMembers: sql<number>`(
              select count(*) from ${membership}
              where ${membership.campaignId} = ${membershipCampaign.id}
                and ${membership.status} = 'active'
            )`,
            pendingReview: sql<number>`(
              select count(*) from ${registration}
              where ${registration.campaignId} = ${membershipCampaign.id}
                and ${registration.status} = 'pending_review'
            )`,
          })
          .from(membershipCampaign)
          .where(where)
          .orderBy(sql`${membershipCampaign.membershipStartsAt} desc`)
          .limit(params.limit)
          .offset(params.offset),
        db
          .select({ value: sql<number>`count(*)` })
          .from(membershipCampaign)
          .where(where),
      ]);

      return {
        rows: rows.map((row) => ({
          ...row.campaign,
          activeMembers: Number(row.activeMembers),
          pendingReview: Number(row.pendingReview),
        })),
        total: Number(countRow?.value ?? 0),
      };
    },
  };
}

export type CampaignRepository = ReturnType<typeof createCampaignRepository>;

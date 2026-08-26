import { and, eq, ne } from "drizzle-orm";

import type { Database } from "../client";
import {
  membershipCampaign,
  type membershipCampaignStateEnum,
} from "../schema/membership-campaign";
import { NotFoundError } from "./errors";
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
          .set({ isCurrent: true })
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
          .set({ isRegistrationOpen: true })
          .where(eq(membershipCampaign.id, campaignId))
          .returning();
        if (!row) throw new NotFoundError(`No campaign with id ${campaignId}`);
        return row;
      });
    },
  };
}

export type CampaignRepository = ReturnType<typeof createCampaignRepository>;

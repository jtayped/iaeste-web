import { sql } from "drizzle-orm";

import type { Db } from "../client";

/**
 * Dashboard / campaign-detail counts for whichever campaign is currently
 * `is_current`. All six numbers come back from one round trip (the plan's
 * "one query that returns them together, not six round trips"). When no
 * campaign is current every count is 0 and `campaignId` is null.
 */
export interface CurrentCampaignCounts {
  campaignId: string | null;
  pendingVerification: number;
  pendingReview: number;
  activeMembers: number;
  newMembers: number;
  returningMembers: number;
  unrenewedPastMembers: number;
}

interface CountsRow extends Record<string, unknown> {
  campaign_id: string | null;
  pending_verification: number | string;
  pending_review: number | string;
  active_members: number | string;
  new_members: number | string;
  returning_members: number | string;
  unrenewed_past_members: number | string;
}

export function createOverviewRepository(db: Db) {
  return {
    async currentCampaignCounts(): Promise<CurrentCampaignCounts> {
      const result = await db.execute<CountsRow>(sql`
        with cur as (
          select id from membership_campaign where is_current limit 1
        )
        select
          (select id from cur) as campaign_id,
          (select count(*) from registration r
             where r.campaign_id = (select id from cur)
               and r.status = 'pending_email') as pending_verification,
          (select count(*) from registration r
             where r.campaign_id = (select id from cur)
               and r.status = 'pending_review') as pending_review,
          (select count(*) from membership m
             where m.campaign_id = (select id from cur)
               and m.status = 'active') as active_members,
          (select count(*) from membership m
             where m.campaign_id = (select id from cur)
               and m.status = 'active'
               and (select count(*) from membership m2
                    where m2.user_id = m.user_id) = 1) as new_members,
          (select count(*) from membership m
             where m.campaign_id = (select id from cur)
               and m.status = 'active'
               and (select count(*) from membership m2
                    where m2.user_id = m.user_id) > 1) as returning_members,
          (select count(distinct m.user_id) from membership m
             join membership_campaign c on c.id = m.campaign_id
             where c.is_current = false
               and not exists (
                 select 1 from membership mc
                 where mc.user_id = m.user_id
                   and mc.campaign_id = (select id from cur)
               )) as unrenewed_past_members
      `);

      const row = result.rows[0];
      return {
        campaignId: row?.campaign_id ?? null,
        pendingVerification: Number(row?.pending_verification ?? 0),
        pendingReview: Number(row?.pending_review ?? 0),
        activeMembers: Number(row?.active_members ?? 0),
        newMembers: Number(row?.new_members ?? 0),
        returningMembers: Number(row?.returning_members ?? 0),
        unrenewedPastMembers: Number(row?.unrenewed_past_members ?? 0),
      };
    },
  };
}

export type OverviewRepository = ReturnType<typeof createOverviewRepository>;

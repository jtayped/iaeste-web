import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { idColumn, timestamps } from "./columns";
import { membershipCampaign } from "./membership-campaign";
import { user } from "./auth";

/**
 * Starts `active`; `left` and `kicked` are terminal for that row — ending a
 * membership never deletes it, and rejoining a later campaign is a new row
 * (unique per (userId, campaignId), so it cannot reuse this one). See
 * `docs/membership-lifecycle.md` question 9.
 */
export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "left",
  "kicked",
]);

export const membership = pgTable(
  "membership",
  {
    id: idColumn(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => membershipCampaign.id, { onDelete: "restrict" }),
    status: membershipStatusEnum("status").notNull().default("active"),
    // How this row came to exist: "registration" (accepted a public
    // registration), "invitation" (accepted a member_invitation), or
    // "admin" (created directly by an admin).
    source: text("source").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedReason: text("ended_reason"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("membership_user_campaign_key").on(
      table.userId,
      table.campaignId,
    ),
    // `kicked` requires a reason (docs/membership-lifecycle.md question 9);
    // `left` requires an end date but no reason is implied; `active` has
    // neither set yet.
    check(
      "membership_status_end_fields",
      sql`
        (${table.status} = 'active' and ${table.endedAt} is null and ${table.endedReason} is null)
        or (${table.status} = 'left' and ${table.endedAt} is not null)
        or (${table.status} = 'kicked' and ${table.endedAt} is not null and ${table.endedReason} is not null)
      `,
    ),
    // "Current members": active rows for whichever campaign is current.
    // Partial so the index stays small as history accumulates.
    index("membership_active_by_campaign_idx")
      .on(table.campaignId)
      .where(sql`${table.status} = 'active'`),
  ],
);

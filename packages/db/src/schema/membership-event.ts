import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { idColumn } from "./columns";
import { membershipCampaign } from "./membership-campaign";
import { user } from "./auth";

/**
 * Append-only audit log. Every status transition on `membership` (and the
 * invitation/role actions around it) writes exactly one row here — see the
 * plan's "Rules" section ("Every status transition happens in a transaction
 * and writes a membership_event"). Rows are never updated or deleted.
 */
export const membershipEventTypeEnum = pgEnum("membership_event_type", [
  "joined",
  "renewed",
  "left",
  "kicked",
  "restored",
  "invited",
  "role_changed",
]);

export const membershipEvent = pgTable(
  "membership_event",
  {
    id: idColumn(),
    eventType: membershipEventTypeEnum("event_type").notNull(),
    // Who did this. Null for a system action (e.g. an automated expiry).
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    // Whose membership this event is about. Not a `membership_id` FK
    // because `invited` happens before any `membership` row exists.
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // Most event types are campaign-scoped; nullable for the rare one that
    // is not (e.g. a global `role_changed`).
    campaignId: text("campaign_id").references(() => membershipCampaign.id, {
      onDelete: "restrict",
    }),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("membership_event_target_idx").on(table.targetUserId)],
);

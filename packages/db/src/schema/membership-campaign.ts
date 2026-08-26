import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { idColumn, timestamps } from "./columns";

/**
 * Administrative lifecycle bucket, independent of `isCurrent` /
 * `isRegistrationOpen`. Not spelled out field-by-field in the plan beyond
 * "state" existing, so reconstructed narrowly: `draft` campaigns are still
 * being configured and must never carry either boolean flag; `published`
 * covers everything from "registration not open yet" through "current
 * membership cohort" (the two flags already say which, precisely);
 * `archived` is a campaign that is done and whose Sheet projection has
 * stopped updating. This column is for admin filtering/display — it is
 * never consulted to answer "is this the current campaign", which is what
 * the partial unique indexes below are for.
 */
export const membershipCampaignStateEnum = pgEnum("membership_campaign_state", [
  "draft",
  "published",
  "archived",
]);

export const membershipCampaign = pgTable(
  "membership_campaign",
  {
    id: idColumn(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    membershipStartsAt: timestamp("membership_starts_at", {
      withTimezone: true,
    }).notNull(),
    membershipEndsAt: timestamp("membership_ends_at", {
      withTimezone: true,
    }).notNull(),
    registrationOpensAt: timestamp("registration_opens_at", {
      withTimezone: true,
    }).notNull(),
    registrationClosesAt: timestamp("registration_closes_at", {
      withTimezone: true,
    }).notNull(),
    // Explicit, authoritative flags — never derived from the timestamps
    // above at read time. See the plan's "Precedence rule" and
    // `docs/membership-lifecycle.md` question 6: a scheduled job reads the
    // timestamps and flips these flags; every other caller just reads the
    // flag. The partial unique indexes below are what make "authoritative"
    // true rather than aspirational.
    isCurrent: boolean("is_current").notNull().default(false),
    isRegistrationOpen: boolean("is_registration_open")
      .notNull()
      .default(false),
    state: membershipCampaignStateEnum("state").notNull().default("draft"),
    // Sheets projection freshness (IA-54). No separate sync-log table — see
    // the plan's "Tables" section ("There is no `campaign_sheet_sync`
    // table").
    sheetTabName: text("sheet_tab_name"),
    sheetSyncedAt: timestamp("sheet_synced_at", { withTimezone: true }),
    sheetStale: boolean("sheet_stale").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("membership_campaign_slug_key").on(table.slug),
    check(
      "membership_campaign_membership_range",
      sql`${table.membershipEndsAt} > ${table.membershipStartsAt}`,
    ),
    check(
      "membership_campaign_registration_range",
      sql`${table.registrationClosesAt} > ${table.registrationOpensAt}`,
    ),
    // The precedence rule's enforcement mechanism: a unique index on a
    // constant expression, restricted by a partial `where`, means at most
    // one row in the whole table can have the condition true. Two campaigns
    // can both be non-current, but never two current at once — and the same
    // for registration-open. Modelled directly in Drizzle via `.where()`
    // (no raw-SQL migration needed); see the plan's "Precedence rule".
    uniqueIndex("membership_campaign_one_current")
      .on(sql`(true)`)
      .where(sql`${table.isCurrent}`),
    uniqueIndex("membership_campaign_one_registration")
      .on(sql`(true)`)
      .where(sql`${table.isRegistrationOpen}`),
  ],
);

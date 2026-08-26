import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

import { idColumn, timestamps } from "./columns";
import { membershipCampaign } from "./membership-campaign";
import { user } from "./auth";

/**
 * `pending_email` → `pending_review` → `accepted` | `rejected`. No row may
 * leave `accepted` — enforced by a trigger in migration
 * `0001_registration_status_transition_guard` (a `CHECK` constraint cannot
 * see the previous row, so this is a `BEFORE UPDATE` trigger instead; see
 * that migration's comment). See the plan's "Rules" section.
 */
export const registrationStatusEnum = pgEnum("registration_status", [
  "pending_email",
  "pending_review",
  "accepted",
  "rejected",
]);

/**
 * One row per person per campaign, per the plan: "Stores the form as
 * submitted, forever." `profileSnapshot` is intentionally a frozen JSON
 * blob rather than normalised columns — unlike `member_profile`, this row is
 * never rewritten after submission (edits go through a new registration in a
 * later campaign, not an update to this one).
 */
export const registration = pgTable(
  "registration",
  {
    id: idColumn(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => membershipCampaign.id, { onDelete: "restrict" }),
    // Lowercase, normalised. Deliberately a plain column with a unique
    // index rather than `citext` — see the plan's "Rules" section.
    email: text("email").notNull(),
    // The form as submitted: name, surnames, phone (E.164 + display),
    // degree, study year, previous-member flag, free-text note. Never
    // rewritten after insert.
    profileSnapshot: jsonb("profile_snapshot").notNull(),
    source: text("source").notNull().default("public_form"),
    status: registrationStatusEnum("status").notNull().default("pending_email"),
    verificationExpiresAt: timestamp("verification_expires_at", {
      withTimezone: true,
    }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewerId: text("reviewer_id").references(() => user.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("registration_campaign_email_key").on(
      table.campaignId,
      table.email,
    ),
    index("registration_email_idx").on(table.email),
    index("registration_campaign_status_idx").on(
      table.campaignId,
      table.status,
    ),
  ],
);

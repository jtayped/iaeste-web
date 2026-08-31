import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { idColumn, timestamps } from "./columns";
import { membershipCampaign } from "./membership-campaign";
import { memberEmailKindEnum } from "./user-email";

/** An application that has not yet proved both addresses and been submitted. */
export const registrationDraft = pgTable(
  "registration_draft",
  {
    id: idColumn(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => membershipCampaign.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [index("registration_draft_expiry_idx").on(table.expiresAt)],
);

/** One independently verified address within a registration draft. */
export const registrationDraftEmail = pgTable(
  "registration_draft_email",
  {
    id: idColumn(),
    draftId: text("draft_id")
      .notNull()
      .references(() => registrationDraft.id, { onDelete: "cascade" }),
    kind: memberEmailKindEnum("kind").notNull(),
    email: text("email").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verificationTokenHash: text("verification_token_hash").notNull(),
    verificationExpiresAt: timestamp("verification_expires_at", {
      withTimezone: true,
    }).notNull(),
    sessionTokenHash: text("session_token_hash"),
    sessionExpiresAt: timestamp("session_expires_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("registration_draft_email_kind_key").on(
      table.draftId,
      table.kind,
    ),
    uniqueIndex("registration_draft_email_verification_token_key").on(
      table.verificationTokenHash,
    ),
    uniqueIndex("registration_draft_email_session_token_key").on(
      table.sessionTokenHash,
    ),
    index("registration_draft_email_address_idx").on(table.email),
  ],
);

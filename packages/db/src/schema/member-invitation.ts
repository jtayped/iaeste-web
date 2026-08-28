import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { idColumn, timestamps } from "./columns";
import { membershipCampaign } from "./membership-campaign";
import { user } from "./auth";

/**
 * Pre-approval for a campaign (docs/membership-lifecycle.md question 8).
 * "Expired" is deliberately not a stored state — it is `pending` rows past
 * `expiresAt`, read at query time, the same way any other simple expiry
 * check is done. That is different from `is_current`/`is_registration_open`
 * on `membership_campaign`, which must be authoritative because many
 * unrelated callers need the same answer; an invitation's expiry has one
 * reader (the accept endpoint) and no coexistence rule to protect.
 */
export const memberInvitationStatusEnum = pgEnum("member_invitation_status", [
  "pending",
  "accepted",
  "cancelled",
]);

/** `member` or `admin` — see docs/membership-lifecycle.md questions 8 and 10. */
export const memberInvitationRoleEnum = pgEnum("member_invitation_role", [
  "member",
  "admin",
]);

export const memberInvitation = pgTable(
  "member_invitation",
  {
    id: idColumn(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => membershipCampaign.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    intendedRole: memberInvitationRoleEnum("intended_role")
      .notNull()
      .default("member"),
    // Optional "invite with a name" prefill for the onboarding form (IA-32).
    // The onboarding form renders these editable; the person can correct or
    // fill them. Never authoritative — the submitted form is.
    prefillName: text("prefill_name"),
    prefillSurnames: text("prefill_surnames"),
    tokenHash: text("token_hash").notNull(),
    status: memberInvitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    // "Pending invitation expiry": the accept endpoint and an expiry sweep
    // both need pending rows ordered/filtered by expiresAt.
    index("member_invitation_pending_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.status} = 'pending'`),
  ],
);

import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { idColumn } from "./columns";
import { registration } from "./registration";

/**
 * Append-style log of verification attempts for a registration's email.
 * Never stores a raw token — only its hash — so a leaked database dump
 * cannot be used to complete a pending registration. A registration can
 * accumulate more than one row here (e.g. "resend the email"); the row
 * `registration.verifiedAt` is set from records the current
 * `pending_email` verification succeeded.
 */
export const registrationVerification = pgTable(
  "registration_verification",
  {
    id: idColumn(),
    registrationId: text("registration_id")
      .notNull()
      .references(() => registration.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("registration_verification_registration_idx").on(
      table.registrationId,
    ),
  ],
);

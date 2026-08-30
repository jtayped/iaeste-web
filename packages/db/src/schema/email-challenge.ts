import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { idColumn } from "./columns";

/**
 * Proof that whoever is filling the registration form controls the address
 * they typed, established *before* anything is written about them.
 *
 * This is what makes the "we already know you" step possible without turning
 * the public form into an enumeration oracle. The form's first step posts an
 * email and gets nothing back but "ok"; a six-digit code goes to the inbox;
 * only once that code comes back does the API say whether the address is
 * known, hand over the stored profile, or list past memberships. Someone who
 * guesses `algu@udl.cat` learns nothing at all.
 *
 * It also replaces the trailing verification round-trip: a registration
 * created against a consumed challenge is already `pending_review`, because
 * the address was proven a minute earlier. `registration_verification` stays
 * for the older link-in-the-email path, which is a different token with a
 * different lifetime bound to a registration that already exists.
 *
 * Never stores the raw code or the raw session token — only their hashes —
 * so a database dump cannot be replayed into somebody else's registration.
 */
export const emailChallenge = pgTable(
  "email_challenge",
  {
    id: idColumn(),
    /** Lowercase, normalised — matched against `registration.email`. */
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /**
     * Wrong guesses so far. A six-digit code is only 20 bits, so the cap
     * enforced against this column — not the code's length — is what makes
     * it unguessable in practice.
     */
    attemptCount: integer("attempt_count").notNull().default(0),
    /** When the right code arrived. A challenge is single use. */
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    /**
     * Issued at consume time and carried by the browser for the rest of the
     * flow, so the later steps never have to re-prove the address (and the
     * client never has to hold the code itself).
     */
    sessionTokenHash: text("session_token_hash"),
    sessionExpiresAt: timestamp("session_expires_at", { withTimezone: true }),
    /** Set when a registration is created against this session. Also single use. */
    sessionConsumedAt: timestamp("session_consumed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("email_challenge_email_idx").on(table.email),
    index("email_challenge_session_idx").on(table.sessionTokenHash),
  ],
);

import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

import { timestamps } from "./columns";
import { user } from "./auth";

/**
 * Current, mutable profile data for a person who has an account. One row per
 * `user`. Unlike `registration` (an annual snapshot, never rewritten), this
 * is "what is true about this person right now" — see
 * `docs/membership-lifecycle.md` rule 12 and the plan's "Rules" section.
 */
export const memberProfile = pgTable(
  "member_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    surnames: text("surnames").notNull(),
    // E.164 (e.g. `+34623324234`) for anything that dials or texts the
    // number programmatically, plus the display form the person typed, so we
    // never have to reformat a phone number for humans from its E.164 form.
    phoneE164: text("phone_e164").notNull(),
    phoneDisplay: text("phone_display").notNull(),
    degree: text("degree").notNull(),
    studyYear: integer("study_year").notNull(),
    ...timestamps(),
  },
  (table) => [
    check(
      "member_profile_study_year_range",
      sql`${table.studyYear} between 1 and 6`,
    ),
  ],
);

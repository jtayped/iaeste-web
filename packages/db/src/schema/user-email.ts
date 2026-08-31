import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { idColumn, timestamps } from "./columns";
import { user } from "./auth";

export const memberEmailKindEnum = pgEnum("member_email_kind", [
  "university",
  "personal",
]);

/** Verified and pending addresses that resolve to one Better Auth user. */
export const userEmail = pgTable(
  "user_email",
  {
    id: idColumn(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    kind: memberEmailKindEnum("kind").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("user_email_address_key").on(table.email),
    uniqueIndex("user_email_user_kind_key").on(table.userId, table.kind),
  ],
);

import { index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { timestamps } from "./columns";
import { idColumn } from "./columns";
import { user } from "./auth";

/**
 * A browser push subscription belonging to a signed-in admin, as produced by
 * `PushManager.subscribe()`. One person can have several (laptop, phone), so
 * the key is the endpoint URL, not the user.
 *
 * These are notification transport, not identity or authorization: every send
 * still re-checks that the owner is an admin at dispatch time, and a 404/410
 * from the push service means the subscription is dead and the row is deleted.
 * Nothing here is security-sensitive beyond the `p256dh`/`auth` secrets, which
 * only let this server encrypt payloads to that one browser.
 */
export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: idColumn(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    // Free-text UA string, purely so the person can tell two devices apart in
    // a future "your devices" list. Never parsed.
    userAgent: text("user_agent"),
    ...timestamps(),
  },
  (table) => [
    unique("push_subscription_endpoint_key").on(table.endpoint),
    index("push_subscription_user_id_idx").on(table.userId),
  ],
);

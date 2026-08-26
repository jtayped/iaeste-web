import { text, timestamp } from "drizzle-orm/pg-core";

/**
 * Primary key shape shared by every IAESTE-owned table (Better Auth's own
 * tables in `auth.ts` keep the ids Better Auth generates itself). A random
 * UUID generated in application code, stored as `text` — matching Better
 * Auth's own id columns — rather than a Postgres `uuid` column so both sides
 * of a foreign key are the same type without a cast, and rather than
 * `gen_random_uuid()` so no extension is required.
 */
export function idColumn() {
  return text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
}

/** `created_at` / `updated_at`, present on every mutable table. */
export function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

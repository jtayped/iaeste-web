/**
 * Dev-only: provision an admin user (+ member_profile) and print a working
 * magic-link URL, so you can sign into the admin app locally without a real
 * RESEND_API_KEY. Never used in production.
 *
 *   npm --workspace @repo/api exec -- tsx scripts/dev-magic-link.ts you@example.com
 */
import { eq } from "drizzle-orm";

import { createAuth } from "@repo/auth";
import { getDb } from "@repo/db/client";
import { memberProfile, user } from "@repo/db/schema";
import type { Emailer } from "@repo/email/resend";
import { Children, isValidElement, type ReactNode } from "react";

import {
  getAuthBaseUrl,
  getAuthSecret,
  getAuthTrustedOrigins,
} from "../src/config";

function findHref(node: ReactNode): string | undefined {
  if (!isValidElement<{ href?: unknown; children?: ReactNode }>(node))
    return undefined;
  if (typeof node.props.href === "string") return node.props.href;
  for (const child of Children.toArray(node.props.children)) {
    const href = findHref(child);
    if (href) return href;
  }
  return undefined;
}

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("usage: tsx scripts/dev-magic-link.ts <email>");
  process.exit(1);
}

const db = getDb();

let [row] = await db.select().from(user).where(eq(user.email, email));
if (!row) {
  [row] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name: "Dev Admin",
      email,
      emailVerified: true,
      role: "admin",
    })
    .returning();
  console.log(`created user ${row!.id} (role=admin)`);
} else {
  await db.update(user).set({ role: "admin" }).where(eq(user.id, row.id));
  console.log(`reused user ${row.id}, ensured role=admin`);
}

await db
  .insert(memberProfile)
  .values({
    userId: row!.id,
    name: "Dev",
    surnames: "Admin",
    phoneE164: "+34600000000",
    phoneDisplay: "600 000 000",
    degree: "Grau en Informàtica (Lleida)",
    studyYear: 3,
  })
  .onConflictDoNothing();

let captured: string | undefined;
const emailer: Emailer = {
  async send(message) {
    captured = findHref(message.react);
  },
};

const auth = createAuth({
  db,
  emailer,
  baseURL: getAuthBaseUrl(),
  secret: getAuthSecret(),
  trustedOrigins: getAuthTrustedOrigins(),
  runtime: "development",
  insecureCookies: true,
});

await auth.api.signInMagicLink({
  body: { email, callbackURL: "/" },
  headers: new Headers({ origin: getAuthBaseUrl() }),
});

if (!captured) {
  console.error("no magic link was generated");
  process.exit(1);
}
console.log("\nOpen this in your browser to sign in:\n");
console.log("  " + captured + "\n");
process.exit(0);

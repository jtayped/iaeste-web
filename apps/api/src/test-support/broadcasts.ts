import type { Database } from "@repo/db/client";
import { createMembershipRepository } from "@repo/db/repositories";
import { memberProfile, registration } from "@repo/db/schema";
import {
  createTestUser,
  testProfileSnapshot,
} from "@repo/db/test-support/fixtures";
import type { BatchEmail } from "@repo/email/resend";

import { createApp } from "../app";
import { createBroadcastService } from "../services/broadcast-service";
import { createStubAuth, quietLogger } from "./app";

/** Shared fixtures for routes/admin-broadcasts.test.ts. */

export function recordingEmailer(options: { failFor?: string[] } = {}) {
  const batches: BatchEmail[][] = [];
  const singles: { to: string; subject: string }[] = [];
  return {
    batches,
    singles,
    /** Every recipient across every batch, flattened. */
    get all(): BatchEmail[] {
      return batches.flat();
    },
    emailer: {
      async send({ to, subject }: { to: string | string[]; subject: string }) {
        singles.push({ to: Array.isArray(to) ? (to[0] ?? "") : to, subject });
      },
      async sendBatch(emails: readonly BatchEmail[]) {
        batches.push([...emails]);
        const failed = emails
          .filter((email) => options.failFor?.includes(email.to))
          .map((email) => ({ to: email.to, reason: "mailbox full" }));
        return { sent: emails.length - failed.length, failed };
      },
    },
  };
}

export function makeApp(
  db: Database,
  emailer: ReturnType<typeof recordingEmailer>["emailer"],
  role: "member" | "admin" = "admin",
) {
  return createApp({
    db,
    auth: createStubAuth({
      role,
      id: "actor_1",
      email: "cap@iaestelleida.cat",
      name: "Cap Comite",
    }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    broadcastService: createBroadcastService({ db, emailer }),
  });
}

export function post(a: ReturnType<typeof makeApp>, path: string, body: unknown) {
  return a.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function seedRegistration(
  db: Database,
  campaignId: string,
  name: string,
  overrides: Record<string, unknown> = {},
) {
  const email = `${name.toLowerCase()}@alumnes.udl.cat`;
  const [row] = await db
    .insert(registration)
    .values({
      campaignId,
      email,
      universityEmail: email,
      profileSnapshot: testProfileSnapshot({ name, surnames: "Prova" }),
      source: "public_form",
      status: "pending_review",
      ...overrides,
    })
    .returning();
  return row!;
}

export async function seedMember(db: Database, campaignId: string, name: string) {
  const user = await createTestUser(db, {
    name,
    email: `${name.toLowerCase()}@alumnes.udl.cat`,
  });
  await db.insert(memberProfile).values({
    userId: user.id,
    name,
    surnames: "Prova",
    phoneE164: "+34600111222",
    phoneDisplay: "600 111 222",
    degree: "grau en informàtica (lleida)",
    studyYear: 3,
  });
  await createMembershipRepository(db).join({
    userId: user.id,
    campaignId,
    source: "registration",
  });
  return user;
}

import crypto from "node:crypto";

import type { Database } from "@repo/db/client";
import {
  createCampaignRepository,
  createRegistrationRepository,
} from "@repo/db/repositories";
import { user } from "@repo/db/schema";
import type { Emailer, SendEmailOptions } from "@repo/email/resend";

/** Shared fixtures/helpers for registration-service.test.ts and registration-service.admin.test.ts. */

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function createRecordingEmailer(): Emailer & {
  sent: SendEmailOptions[];
} {
  const sent: SendEmailOptions[] = [];
  return {
    sent,
    async send(options) {
      sent.push(options);
    },
  };
}

export function createFailingEmailer(): Emailer {
  return {
    async send() {
      throw new Error("Resend is down");
    },
  };
}

export async function openCampaign(db: Database) {
  const campaigns = createCampaignRepository(db);
  const campaign = await campaigns.create({
    slug: `campaign-${Math.random().toString(36).slice(2)}`,
    label: "Curs 2026-2027",
    membershipStartsAt: new Date("2026-09-01T00:00:00Z"),
    membershipEndsAt: new Date("2027-06-30T00:00:00Z"),
    registrationOpensAt: new Date("2026-08-01T00:00:00Z"),
    registrationClosesAt: new Date("2026-09-30T00:00:00Z"),
  });
  return campaigns.setRegistrationOpen(campaign.id);
}

export function profileSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    name: "Joana",
    surnames: "Serra Puig",
    phoneE164: "+34623324234",
    phoneDisplay: "+34 623 32 42 34",
    degree: "Grau en Informàtica (Lleida)",
    studyYear: 3,
    note: "",
    ...overrides,
  };
}

export async function createRegistrationRow(
  db: Database,
  campaignId: string,
  email: string,
) {
  const registrations = createRegistrationRepository(db);
  return registrations.create({
    campaignId,
    email,
    profileSnapshot: profileSnapshot(),
  });
}

export async function createPendingReview(
  db: Database,
  campaignId: string,
  email: string,
) {
  const registrations = createRegistrationRepository(db);
  const created = await createRegistrationRow(db, campaignId, email);
  await registrations.markEmailVerified(created.id);
  return created;
}

/** `registration.reviewer_id` is a real FK into `user` — accept/reject need one. */
export async function createReviewer(db: Database) {
  const [row] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name: "Test Reviewer",
      email: `reviewer-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    })
    .returning();
  if (!row) throw new Error("Failed to create test reviewer");
  return row;
}

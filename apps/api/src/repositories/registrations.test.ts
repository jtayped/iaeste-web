import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import type { Registration } from "@repo/constants/validators/registration";
import type { Database } from "@repo/db/client";
import {
  createCampaignRepository,
  createRegistrationRepository,
} from "@repo/db/repositories";
import { registrationVerification } from "@repo/db/schema";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import type { Emailer, SendEmailOptions } from "@repo/email/resend";

import { createApp } from "../app";
import {
  createDrizzleRegistrationRepository,
  RegistrationAlreadyExistsError,
} from "./registrations";

/** Records every send instead of hitting the real Resend API. */
function createRecordingEmailer(): Emailer & { sent: SendEmailOptions[] } {
  const sent: SendEmailOptions[] = [];
  return {
    sent,
    async send(options) {
      sent.push(options);
    },
  };
}

const validRegistration: Registration = {
  name: "Joan",
  surnames: "Garcia Serra",
  email: "joan@alumnes.udl.cat",
  phone: "+34 623 32 42 34",
  degree: "Grau en Informàtica (Lleida)",
  year: 2,
  note: "Hola",
};

async function openCampaignForRegistration(db: Database) {
  const campaigns = createCampaignRepository(db);
  const campaign = await campaigns.create({
    slug: `campaign-${Math.random().toString(36).slice(2)}`,
    label: "Test campaign",
    membershipStartsAt: new Date("2026-09-01T00:00:00Z"),
    membershipEndsAt: new Date("2027-06-30T00:00:00Z"),
    registrationOpensAt: new Date("2026-08-01T00:00:00Z"),
    registrationClosesAt: new Date("2026-09-30T00:00:00Z"),
  });
  return campaigns.setRegistrationOpen(campaign.id);
}

// This must run before the describe block below ever calls `getTestDb()`
// (which points `DATABASE_URL` at the test database for the rest of this
// process) — it exists to prove the trap called out in IA-12: a repository
// factory (or `createApp()`) that resolves `@repo/db`'s connection eagerly,
// at construction time rather than inside `.create()`, would make merely
// importing `app.ts` (which `apps/api/scripts/generate-openapi.ts` does on
// every push) crash whenever `DATABASE_URL` isn't set.
describe("createDrizzleRegistrationRepository laziness", () => {
  it("never resolves DATABASE_URL until .create() is actually called", () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      assert.doesNotThrow(() => createDrizzleRegistrationRepository());
      // createApp() with no dependency overrides is exactly what app.ts
      // does at module-import time.
      assert.doesNotThrow(() => createApp());
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});

describe("createDrizzleRegistrationRepository", () => {
  let db: Database;

  before(async () => {
    // `getDb()` (used inside the repository under test) reads
    // `process.env.DATABASE_URL` and memoises its pool on first use, so
    // point it at the same real database `getTestDb()` migrates and this
    // test file asserts against.
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    db = await getTestDb();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  after(async () => {
    await closeTestDb();
  });

  it("inserts a registration into Postgres when a campaign is open for registration", async () => {
    const campaign = await openCampaignForRegistration(db);
    const emailer = createRecordingEmailer();
    const repository = createDrizzleRegistrationRepository({ emailer });

    await repository.create(validRegistration);

    const registrations = createRegistrationRepository(db);
    const saved = await registrations.getByCampaignAndEmail(
      campaign.id,
      validRegistration.email,
    );

    assert.ok(saved);
    assert.equal(saved?.status, "pending_email");
    assert.deepEqual(saved?.profileSnapshot, {
      name: "Joan",
      surnames: "Garcia Serra",
      // Real E.164/international parsing (IA-40), not a copy of the raw
      // submitted string.
      phoneE164: "+34623324234",
      phoneDisplay: "+34 623 32 42 34",
      degree: "Grau en Informàtica (Lleida)",
      studyYear: 2,
      note: "Hola",
    });
  });

  it("throws clearly when no campaign is open for registration", async () => {
    const repository = createDrizzleRegistrationRepository({
      emailer: createRecordingEmailer(),
    });

    await assert.rejects(
      () => repository.create(validRegistration),
      /No campaign is currently open for registration/,
    );
  });

  it("throws RegistrationAlreadyExistsError for a second registration with the same email", async () => {
    await openCampaignForRegistration(db);
    const repository = createDrizzleRegistrationRepository({
      emailer: createRecordingEmailer(),
    });

    await repository.create(validRegistration);

    await assert.rejects(
      () => repository.create(validRegistration),
      RegistrationAlreadyExistsError,
    );
  });

  it("stores a hashed verification token and emails the applicant", async () => {
    const campaign = await openCampaignForRegistration(db);
    const emailer = createRecordingEmailer();
    const repository = createDrizzleRegistrationRepository({ emailer });

    await repository.create(validRegistration);

    assert.equal(emailer.sent.length, 1);
    assert.equal(emailer.sent[0]?.to, validRegistration.email);

    const registrations = createRegistrationRepository(db);
    const saved = await registrations.getByCampaignAndEmail(
      campaign.id,
      validRegistration.email,
    );
    assert.ok(saved);

    const [verificationRow] = await db
      .select()
      .from(registrationVerification)
      .where(eq(registrationVerification.registrationId, saved!.id));
    assert.ok(verificationRow);
    assert.ok(verificationRow.tokenHash);
    // The raw token is never stored — only its hash, which is not
    // trivially the raw hex string itself.
    assert.equal(verificationRow.tokenHash.length, 64); // sha256 hex digest
    assert.equal(verificationRow.consumedAt, null);
    const hoursUntilExpiry =
      (verificationRow.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
    assert.ok(hoursUntilExpiry > 23 && hoursUntilExpiry <= 24);
  });

  it("still creates the registration when the verification email fails to send", async () => {
    await openCampaignForRegistration(db);
    const failingEmailer = {
      async send() {
        throw new Error("Resend is down");
      },
    };
    const repository = createDrizzleRegistrationRepository({
      emailer: failingEmailer,
    });

    await assert.doesNotReject(() => repository.create(validRegistration));

    const registrations = createRegistrationRepository(db);
    const saved = await registrations.getByCampaignAndEmail(
      (await createCampaignRepository(db).getOpenForRegistration())!.id,
      validRegistration.email,
    );
    assert.ok(saved);
    assert.equal(saved?.status, "pending_email");
  });
});

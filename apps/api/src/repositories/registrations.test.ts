import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Registration } from "@repo/constants/validators/registration";
import type { Database } from "@repo/db/client";
import {
  createCampaignRepository,
  createRegistrationRepository,
} from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";

import { createApp } from "../app";
import { createDrizzleRegistrationRepository } from "./registrations";

const validRegistration: Registration = {
  name: "Joan",
  surnames: "Garcia Serra",
  email: "joan@alumnes.udl.cat",
  phone: "+34 623 32 42 34",
  degree: "Grau en Informàtica (Lleida)",
  year: 2,
  previousMember: false,
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
    const repository = createDrizzleRegistrationRepository();

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
      phoneE164: "+34 623 32 42 34",
      phoneDisplay: "+34 623 32 42 34",
      degree: "Grau en Informàtica (Lleida)",
      studyYear: 2,
      previousMember: false,
      note: "Hola",
    });
  });

  it("throws clearly when no campaign is open for registration", async () => {
    const repository = createDrizzleRegistrationRepository();

    await assert.rejects(
      () => repository.create(validRegistration),
      /No campaign is currently open for registration/,
    );
  });
});

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createTestCampaign,
  testProfileSnapshot,
} from "../test-support/fixtures";
import { createRegistrationRepository } from "./registrations";
import { createRegistrationVerificationRepository } from "./registration-verifications";
import { IllegalTransitionError } from "./errors";

describe("registration verifications repository", () => {
  let db: Database;

  before(async () => {
    db = await getTestDb();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  after(async () => {
    await closeTestDb();
  });

  async function createPendingRegistration() {
    const registrations = createRegistrationRepository(db);
    const campaign = await createTestCampaign(db);
    return registrations.create({
      campaignId: campaign.id,
      email: "person@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
  }

  it("consumes a valid token exactly once", async () => {
    const verifications = createRegistrationVerificationRepository(db);
    const registration = await createPendingRegistration();

    const created = await verifications.create({
      registrationId: registration.id,
      tokenHash: "hash-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const consumed = await verifications.consume("hash-1");
    assert.equal(consumed.id, created.id);
    assert.ok(consumed.consumedAt);

    await assert.rejects(
      () => verifications.consume("hash-1"),
      IllegalTransitionError,
    );
  });

  it("rejects an expired token", async () => {
    const verifications = createRegistrationVerificationRepository(db);
    const registration = await createPendingRegistration();

    await verifications.create({
      registrationId: registration.id,
      tokenHash: "hash-expired",
      expiresAt: new Date(Date.now() - 1000),
    });

    await assert.rejects(
      () => verifications.consume("hash-expired"),
      IllegalTransitionError,
    );
  });

  it("rejects an unknown token", async () => {
    const verifications = createRegistrationVerificationRepository(db);
    await assert.rejects(
      () => verifications.consume("no-such-token"),
      IllegalTransitionError,
    );
  });

  it("only one of two concurrent consume attempts on the same token succeeds", async () => {
    const verifications = createRegistrationVerificationRepository(db);
    const registration = await createPendingRegistration();
    await verifications.create({
      registrationId: registration.id,
      tokenHash: "hash-race",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const results = await Promise.allSettled([
      verifications.consume("hash-race"),
      verifications.consume("hash-race"),
    ]);

    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  });

  it("recordAttempt increments the attempt count", async () => {
    const verifications = createRegistrationVerificationRepository(db);
    const registration = await createPendingRegistration();
    const created = await verifications.create({
      registrationId: registration.id,
      tokenHash: "hash-attempts",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await verifications.recordAttempt(created.id);
    await verifications.recordAttempt(created.id);

    const row = await verifications.getByTokenHash("hash-attempts");
    assert.equal(row?.attemptCount, 2);
    assert.ok(row?.lastAttemptAt);
  });
});

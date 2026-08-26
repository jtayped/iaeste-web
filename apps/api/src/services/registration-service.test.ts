import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import {
  createRegistrationRepository,
  createRegistrationVerificationRepository,
  IllegalTransitionError,
} from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";

import {
  createFailingEmailer,
  createPendingReview,
  createRecordingEmailer,
  createRegistrationRow,
  hashToken,
  openCampaign,
} from "../test-support/registrations";
import { createDrizzleRegistrationService } from "./registration-service";

describe("registration service", () => {
  let db: Database;

  before(async () => {
    // Same as repositories/registrations.test.ts: point DATABASE_URL at the
    // test database so the service's internal `getDb()` calls land here.
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    db = await getTestDb();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  after(async () => {
    await closeTestDb();
  });

  describe("list", () => {
    it("lists every status for a campaign, or filters to one", async () => {
      const campaign = await openCampaign(db);
      const pending = await createRegistrationRow(
        db,
        campaign.id,
        "pending@alumnes.udl.cat",
      );
      const reviewed = await createPendingReview(
        db,
        campaign.id,
        "reviewed@alumnes.udl.cat",
      );

      const service = createDrizzleRegistrationService({
        emailer: createRecordingEmailer(),
      });

      const all = await service.list(campaign.id);
      assert.equal(all.length, 2);
      assert.deepEqual(
        new Set(all.map((row) => row.id)),
        new Set([pending.id, reviewed.id]),
      );

      const onlyReviewed = await service.list(campaign.id, "pending_review");
      assert.equal(onlyReviewed.length, 1);
      assert.equal(onlyReviewed[0]?.id, reviewed.id);
      // Dates are serialised, not raw Date objects.
      assert.equal(typeof onlyReviewed[0]?.createdAt, "string");
    });
  });

  describe("resendVerification", () => {
    it("issues a new token, invalidates the old one, and emails the applicant", async () => {
      const campaign = await openCampaign(db);
      const created = await createRegistrationRow(
        db,
        campaign.id,
        "resend@alumnes.udl.cat",
      );
      const verifications = createRegistrationVerificationRepository(db);
      await verifications.create({
        registrationId: created.id,
        tokenHash: hashToken("original-token"),
        expiresAt: new Date(Date.now() + 60_000),
      });

      const emailer = createRecordingEmailer();
      const service = createDrizzleRegistrationService({ emailer });

      await service.resendVerification(created.id);

      assert.equal(emailer.sent.length, 1);
      assert.equal(emailer.sent[0]?.to, "resend@alumnes.udl.cat");

      // The original token no longer works...
      await assert.rejects(
        () => verifications.consume(hashToken("original-token")),
        IllegalTransitionError,
      );
    });

    it("silently does nothing for an unknown registration id", async () => {
      const emailer = createRecordingEmailer();
      const service = createDrizzleRegistrationService({ emailer });

      await assert.doesNotReject(() =>
        service.resendVerification("no-such-id"),
      );
      assert.equal(emailer.sent.length, 0);
    });

    it("silently does nothing once the registration is past pending_email", async () => {
      const campaign = await openCampaign(db);
      const reviewed = await createPendingReview(
        db,
        campaign.id,
        "already-verified@alumnes.udl.cat",
      );
      const emailer = createRecordingEmailer();
      const service = createDrizzleRegistrationService({ emailer });

      await service.resendVerification(reviewed.id);

      assert.equal(emailer.sent.length, 0);
    });

    it("enforces a cooldown between consecutive resends for the same registration", async () => {
      const campaign = await openCampaign(db);
      const created = await createRegistrationRow(
        db,
        campaign.id,
        "cooldown@alumnes.udl.cat",
      );
      const emailer = createRecordingEmailer();
      const service = createDrizzleRegistrationService({ emailer });

      await service.resendVerification(created.id);
      await service.resendVerification(created.id);

      assert.equal(emailer.sent.length, 1);
    });
  });

  describe("verify", () => {
    it("consumes the token, moves pending_email -> pending_review, and emails the applicant (not a membership)", async () => {
      const campaign = await openCampaign(db);
      const created = await createRegistrationRow(
        db,
        campaign.id,
        "verify@alumnes.udl.cat",
      );
      const verifications = createRegistrationVerificationRepository(db);
      await verifications.create({
        registrationId: created.id,
        tokenHash: hashToken("valid-token"),
        expiresAt: new Date(Date.now() + 60_000),
      });

      const emailer = createRecordingEmailer();
      const service = createDrizzleRegistrationService({ emailer });

      await service.verify("valid-token");

      const registrations = createRegistrationRepository(db);
      const row = await registrations.getById(created.id);
      assert.equal(row?.status, "pending_review");
      assert.ok(row?.verifiedAt);

      assert.equal(emailer.sent.length, 1);
      assert.equal(emailer.sent[0]?.to, "verify@alumnes.udl.cat");
    });

    it("rejects an unknown token", async () => {
      const service = createDrizzleRegistrationService({
        emailer: createRecordingEmailer(),
      });

      await assert.rejects(
        () => service.verify("no-such-token"),
        IllegalTransitionError,
      );
    });

    it("rejects an expired token", async () => {
      const campaign = await openCampaign(db);
      const created = await createRegistrationRow(
        db,
        campaign.id,
        "expired@alumnes.udl.cat",
      );
      const verifications = createRegistrationVerificationRepository(db);
      await verifications.create({
        registrationId: created.id,
        tokenHash: hashToken("expired-token"),
        expiresAt: new Date(Date.now() - 1000),
      });

      const service = createDrizzleRegistrationService({
        emailer: createRecordingEmailer(),
      });

      await assert.rejects(
        () => service.verify("expired-token"),
        IllegalTransitionError,
      );
    });

    it("rejects an already-used token", async () => {
      const campaign = await openCampaign(db);
      const created = await createRegistrationRow(
        db,
        campaign.id,
        "reused@alumnes.udl.cat",
      );
      const verifications = createRegistrationVerificationRepository(db);
      await verifications.create({
        registrationId: created.id,
        tokenHash: hashToken("reused-token"),
        expiresAt: new Date(Date.now() + 60_000),
      });

      const service = createDrizzleRegistrationService({
        emailer: createRecordingEmailer(),
      });

      await service.verify("reused-token");
      await assert.rejects(
        () => service.verify("reused-token"),
        IllegalTransitionError,
      );
    });

    it("still verifies the email when the follow-up notification fails to send", async () => {
      const campaign = await openCampaign(db);
      const created = await createRegistrationRow(
        db,
        campaign.id,
        "notify-fails@alumnes.udl.cat",
      );
      const verifications = createRegistrationVerificationRepository(db);
      await verifications.create({
        registrationId: created.id,
        tokenHash: hashToken("some-token"),
        expiresAt: new Date(Date.now() + 60_000),
      });

      const service = createDrizzleRegistrationService({
        emailer: createFailingEmailer(),
      });

      await assert.doesNotReject(() => service.verify("some-token"));

      const registrations = createRegistrationRepository(db);
      const row = await registrations.getById(created.id);
      assert.equal(row?.status, "pending_review");
    });
  });
});

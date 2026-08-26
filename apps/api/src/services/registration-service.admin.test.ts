import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import {
  createRegistrationRepository,
  IllegalTransitionError,
  NotFoundError,
} from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";

import {
  createFailingEmailer,
  createPendingReview,
  createRecordingEmailer,
  createRegistrationRow,
  createReviewer,
  openCampaign,
} from "../test-support/registrations";
import { createDrizzleRegistrationService } from "./registration-service";

describe("registration service admin actions", () => {
  let db: Database;

  before(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    db = await getTestDb();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  after(async () => {
    await closeTestDb();
  });

  describe("accept", () => {
    it("creates the membership and reports the notification as sent", async () => {
      const campaign = await openCampaign(db);
      const created = await createPendingReview(
        db,
        campaign.id,
        "accept@alumnes.udl.cat",
      );
      const emailer = createRecordingEmailer();
      const service = createDrizzleRegistrationService({ emailer });
      const reviewer = await createReviewer(db);

      const result = await service.accept(created.id, {
        reviewerId: reviewer.id,
      });

      assert.equal(result.notificationSent, true);
      assert.equal(emailer.sent.length, 1);
      assert.equal(emailer.sent[0]?.to, "accept@alumnes.udl.cat");

      const registrations = createRegistrationRepository(db);
      const row = await registrations.getById(created.id);
      assert.equal(row?.status, "accepted");
    });

    it("the membership stands even when the acceptance email fails to send", async () => {
      const campaign = await openCampaign(db);
      const created = await createPendingReview(
        db,
        campaign.id,
        "accept-fail@alumnes.udl.cat",
      );
      const service = createDrizzleRegistrationService({
        emailer: createFailingEmailer(),
      });
      const reviewer = await createReviewer(db);

      const result = await service.accept(created.id, {
        reviewerId: reviewer.id,
      });

      assert.equal(result.notificationSent, false);

      const registrations = createRegistrationRepository(db);
      const row = await registrations.getById(created.id);
      assert.equal(row?.status, "accepted");
    });

    it("throws NotFoundError for an unknown registration", async () => {
      const service = createDrizzleRegistrationService({
        emailer: createRecordingEmailer(),
      });

      await assert.rejects(
        () => service.accept("no-such-id", { reviewerId: "reviewer_1" }),
        NotFoundError,
      );
    });

    it("throws IllegalTransitionError when the registration isn't pending_review", async () => {
      const campaign = await openCampaign(db);
      const created = await createRegistrationRow(
        db,
        campaign.id,
        "still-pending@alumnes.udl.cat",
      );
      const service = createDrizzleRegistrationService({
        emailer: createRecordingEmailer(),
      });

      await assert.rejects(
        () => service.accept(created.id, { reviewerId: "reviewer_1" }),
        IllegalTransitionError,
      );
    });
  });

  describe("reject", () => {
    it("rejects the registration and reports the notification as sent", async () => {
      const campaign = await openCampaign(db);
      const created = await createPendingReview(
        db,
        campaign.id,
        "reject@alumnes.udl.cat",
      );
      const emailer = createRecordingEmailer();
      const service = createDrizzleRegistrationService({ emailer });
      const reviewer = await createReviewer(db);

      const result = await service.reject(created.id, {
        reviewerId: reviewer.id,
        reason: "No hi ha places.",
      });

      assert.equal(result.notificationSent, true);
      assert.equal(emailer.sent.length, 1);

      const registrations = createRegistrationRepository(db);
      const row = await registrations.getById(created.id);
      assert.equal(row?.status, "rejected");
      assert.equal(row?.rejectionReason, "No hi ha places.");
    });

    it("throws IllegalTransitionError when the registration isn't pending_review", async () => {
      const campaign = await openCampaign(db);
      const created = await createRegistrationRow(
        db,
        campaign.id,
        "not-yet@alumnes.udl.cat",
      );
      const service = createDrizzleRegistrationService({
        emailer: createRecordingEmailer(),
      });

      await assert.rejects(
        () =>
          service.reject(created.id, {
            reviewerId: "reviewer_1",
            reason: "massa aviat",
          }),
        IllegalTransitionError,
      );
    });
  });
});

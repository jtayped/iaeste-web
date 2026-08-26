import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createTestCampaign,
  createTestUser,
  testProfileSnapshot,
} from "../test-support/fixtures";
import { createRegistrationRepository } from "./registrations";
import { createMembershipRepository } from "./memberships";
import { registration } from "../schema/registration";
import { eq } from "drizzle-orm";
import { IllegalTransitionError, NotFoundError } from "./errors";

describe("registrations repository", () => {
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

  async function createPendingReview() {
    const registrations = createRegistrationRepository(db);
    const campaign = await createTestCampaign(db);
    const created = await registrations.create({
      campaignId: campaign.id,
      email: "Person@Alumnes.UdL.Cat",
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(created.id);
    return { campaign, registration: created };
  }

  it("normalises email to lowercase on create", async () => {
    const registrations = createRegistrationRepository(db);
    const campaign = await createTestCampaign(db);
    const created = await registrations.create({
      campaignId: campaign.id,
      email: "Mixed@Case.Example",
      profileSnapshot: testProfileSnapshot(),
    });
    assert.equal(created.email, "mixed@case.example");
    assert.equal(created.status, "pending_email");
  });

  it("enforces one registration per (campaign, email)", async () => {
    const registrations = createRegistrationRepository(db);
    const campaign = await createTestCampaign(db);
    await registrations.create({
      campaignId: campaign.id,
      email: "dup@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });

    await assert.rejects(() =>
      registrations.create({
        campaignId: campaign.id,
        email: "dup@alumnes.udl.cat",
        profileSnapshot: testProfileSnapshot(),
      }),
    );
  });

  it("listByCampaign lists every status, listByCampaignAndStatus filters to one", async () => {
    const registrations = createRegistrationRepository(db);
    const campaign = await createTestCampaign(db);
    const other = await createTestCampaign(db);

    const pending = await registrations.create({
      campaignId: campaign.id,
      email: "pending@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
    const toVerify = await registrations.create({
      campaignId: campaign.id,
      email: "verified@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(toVerify.id);
    await registrations.create({
      campaignId: other.id,
      email: "elsewhere@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });

    const all = await registrations.listByCampaign(campaign.id);
    assert.equal(all.length, 2);
    assert.deepEqual(
      new Set(all.map((row) => row.id)),
      new Set([pending.id, toVerify.id]),
    );

    const pendingOnly = await registrations.listByCampaignAndStatus(
      campaign.id,
      "pending_email",
    );
    assert.equal(pendingOnly.length, 1);
    assert.equal(pendingOnly[0]?.id, pending.id);
  });

  it("walks pending_email -> pending_review -> accepted, creating exactly one membership", async () => {
    const registrations = createRegistrationRepository(db);
    const memberships = createMembershipRepository(db);
    const { registration: pendingReview } = await createPendingReview();

    const reviewer = await createTestUser(db);
    const result = await registrations.accept(pendingReview.id, {
      reviewerId: reviewer.id,
    });

    assert.equal(result.registration.status, "accepted");
    assert.equal(result.membership.status, "active");

    const membershipRow = await memberships.getForUserAndCampaign(
      result.user.id,
      result.registration.campaignId,
    );
    assert.equal(membershipRow?.id, result.membership.id);
  });

  it("rejects skipping pending_review straight to accepted", async () => {
    const registrations = createRegistrationRepository(db);
    const campaign = await createTestCampaign(db);
    const created = await registrations.create({
      campaignId: campaign.id,
      email: "unverified@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
    const reviewer = await createTestUser(db);

    await assert.rejects(
      () => registrations.accept(created.id, { reviewerId: reviewer.id }),
      IllegalTransitionError,
    );
  });

  it("rejects verifying an already-verified registration a second time", async () => {
    const registrations = createRegistrationRepository(db);
    const { registration: pendingReview } = await createPendingReview();

    await assert.rejects(
      () => registrations.markEmailVerified(pendingReview.id),
      IllegalTransitionError,
    );
  });

  it("reject() moves pending_review -> rejected and records a reason", async () => {
    const registrations = createRegistrationRepository(db);
    const { registration: pendingReview } = await createPendingReview();
    const reviewer = await createTestUser(db);

    const rejected = await registrations.reject(pendingReview.id, {
      reviewerId: reviewer.id,
      reason: "Not a UdL address",
    });

    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.rejectionReason, "Not a UdL address");
  });

  it("the database itself refuses to move a registration out of accepted (trigger), even bypassing the repository", async () => {
    const registrations = createRegistrationRepository(db);
    const { registration: pendingReview } = await createPendingReview();
    const reviewer = await createTestUser(db);
    const { registration: accepted } = await registrations.accept(
      pendingReview.id,
      {
        reviewerId: reviewer.id,
      },
    );

    // Bypass the repository's own CAS guard entirely and hit the table
    // directly, proving the constraint lives in the database, not just in
    // application code.
    await assert.rejects(
      () =>
        db
          .update(registration)
          .set({ status: "rejected" })
          .where(eq(registration.id, accepted.id)),
      (error: Error) => {
        // drizzle wraps the driver error: the trigger's own message (raised
        // by Postgres) lands on `.cause`, not `.message`.
        const cause = error.cause as Error | undefined;
        assert.match(cause?.message ?? "", /cannot change status/i);
        return true;
      },
    );
  });

  it("acting on a registration that does not exist is a NotFoundError", async () => {
    const registrations = createRegistrationRepository(db);
    await assert.rejects(
      () => registrations.markEmailVerified("nope"),
      NotFoundError,
    );
  });

  it("two concurrent accept attempts on the same registration produce exactly one membership", async () => {
    const registrations = createRegistrationRepository(db);
    const memberships = createMembershipRepository(db);
    const { registration: pendingReview } = await createPendingReview();
    const reviewer = await createTestUser(db);

    const results = await Promise.allSettled([
      registrations.accept(pendingReview.id, { reviewerId: reviewer.id }),
      registrations.accept(pendingReview.id, { reviewerId: reviewer.id }),
    ]);

    const fulfilled = results.filter(
      (
        r,
      ): r is PromiseFulfilledResult<
        Awaited<ReturnType<typeof registrations.accept>>
      > => r.status === "fulfilled",
    );
    assert.equal(fulfilled.length, 1);
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);

    const firstFulfilled = fulfilled[0];
    assert.ok(firstFulfilled);
    const { user: acceptedUser, registration: acceptedRegistration } =
      firstFulfilled.value;
    const membershipRow = await memberships.getForUserAndCampaign(
      acceptedUser.id,
      acceptedRegistration.campaignId,
    );
    assert.ok(membershipRow);
    assert.equal(await memberships.countForUser(acceptedUser.id), 1);
  });

  it("reuses the existing user when the same email registers again in a later campaign", async () => {
    const registrations = createRegistrationRepository(db);
    const reviewer = await createTestUser(db);

    const campaign1 = await createTestCampaign(db);
    const reg1 = await registrations.create({
      campaignId: campaign1.id,
      email: "returning@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(reg1.id);
    const { user: firstUser } = await registrations.accept(reg1.id, {
      reviewerId: reviewer.id,
    });

    const campaign2 = await createTestCampaign(db);
    const reg2 = await registrations.create({
      campaignId: campaign2.id,
      email: "returning@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(reg2.id);
    const { user: secondUser } = await registrations.accept(reg2.id, {
      reviewerId: reviewer.id,
    });

    assert.equal(secondUser.id, firstUser.id);
  });
});

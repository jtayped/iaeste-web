import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createTestCampaign,
  createTestUser,
  testProfileSnapshot,
} from "../test-support/fixtures";
import { createCampaignRepository } from "./campaigns";
import { createMembershipRepository } from "./memberships";
import { createRegistrationRepository } from "./registrations";
import { createOverviewRepository } from "./overview";

describe("overview repository", () => {
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

  it("returns all-zero counts and a null campaign id when nothing is current", async () => {
    const counts = await createOverviewRepository(db).currentCampaignCounts();
    assert.deepEqual(counts, {
      campaignId: null,
      pendingVerification: 0,
      pendingReview: 0,
      activeMembers: 0,
      newMembers: 0,
      returningMembers: 0,
      unrenewedPastMembers: 0,
    });
  });

  it("counts registrations, new vs returning members, and unrenewed past members", async () => {
    const campaigns = createCampaignRepository(db);
    const past = await createTestCampaign(db, { slug: "2025-2026" });
    const current = await createTestCampaign(db, { slug: "2026-2027" });
    await campaigns.setCurrent(current.id);

    const memberships = createMembershipRepository(db);
    const registrations = createRegistrationRepository(db);

    // A returning member: row in the past campaign and the current one.
    const returning = await createTestUser(db);
    await memberships.join({
      userId: returning.id,
      campaignId: past.id,
      source: "registration",
    });
    await memberships.join({
      userId: returning.id,
      campaignId: current.id,
      source: "registration",
    });

    // A brand-new member: only the current campaign.
    const fresh = await createTestUser(db);
    await memberships.join({
      userId: fresh.id,
      campaignId: current.id,
      source: "registration",
    });

    // Someone who was a member last year and has not renewed.
    const lapsed = await createTestUser(db);
    await memberships.join({
      userId: lapsed.id,
      campaignId: past.id,
      source: "registration",
    });

    await registrations.create({
      campaignId: current.id,
      email: "a@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
    const toVerify = await registrations.create({
      campaignId: current.id,
      email: "c@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(toVerify.id);

    const counts = await createOverviewRepository(db).currentCampaignCounts();
    assert.equal(counts.campaignId, current.id);
    assert.equal(counts.pendingVerification, 1);
    assert.equal(counts.pendingReview, 1);
    assert.equal(counts.activeMembers, 2);
    assert.equal(counts.newMembers, 1);
    assert.equal(counts.returningMembers, 1);
    assert.equal(counts.unrenewedPastMembers, 1);
  });
});

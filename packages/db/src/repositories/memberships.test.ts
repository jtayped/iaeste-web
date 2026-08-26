import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createTestCampaign, createTestUser } from "../test-support/fixtures";
import { createCampaignRepository } from "./campaigns";
import { createMembershipRepository } from "./memberships";
import { IllegalTransitionError, NotFoundError } from "./errors";

describe("memberships repository", () => {
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

  it("joining for the first time then again is reflected in the user's membership count", async () => {
    const repo = createMembershipRepository(db);
    const campaignA = await createTestCampaign(db);
    const campaignB = await createTestCampaign(db);
    const person = await createTestUser(db);

    await repo.join({
      userId: person.id,
      campaignId: campaignA.id,
      source: "registration",
    });
    assert.equal(await repo.countForUser(person.id), 1);

    await repo.join({
      userId: person.id,
      campaignId: campaignB.id,
      source: "registration",
    });
    assert.equal(await repo.countForUser(person.id), 2);
  });

  it("refuses to join the same (user, campaign) twice", async () => {
    const repo = createMembershipRepository(db);
    const campaign = await createTestCampaign(db);
    const person = await createTestUser(db);

    await repo.join({
      userId: person.id,
      campaignId: campaign.id,
      source: "registration",
    });
    await assert.rejects(
      () =>
        repo.join({
          userId: person.id,
          campaignId: campaign.id,
          source: "registration",
        }),
      IllegalTransitionError,
    );
  });

  it("leave sets endedAt without requiring a reason", async () => {
    const repo = createMembershipRepository(db);
    const campaign = await createTestCampaign(db);
    const person = await createTestUser(db);
    const membership = await repo.join({
      userId: person.id,
      campaignId: campaign.id,
      source: "registration",
    });

    const left = await repo.leave(membership.id);
    assert.equal(left.status, "left");
    assert.ok(left.endedAt);
  });

  it("kick requires a reason and cannot be applied twice", async () => {
    const repo = createMembershipRepository(db);
    const campaign = await createTestCampaign(db);
    const person = await createTestUser(db);
    const membership = await repo.join({
      userId: person.id,
      campaignId: campaign.id,
      source: "registration",
    });

    await assert.rejects(
      () => repo.kick(membership.id, { reason: "" }),
      IllegalTransitionError,
    );

    const kicked = await repo.kick(membership.id, {
      reason: "Missed every event",
    });
    assert.equal(kicked.status, "kicked");
    assert.equal(kicked.endedReason, "Missed every event");

    await assert.rejects(
      () => repo.kick(membership.id, { reason: "again" }),
      IllegalTransitionError,
    );
  });

  it("leaving twice is an illegal transition", async () => {
    const repo = createMembershipRepository(db);
    const campaign = await createTestCampaign(db);
    const person = await createTestUser(db);
    const membership = await repo.join({
      userId: person.id,
      campaignId: campaign.id,
      source: "registration",
    });

    await repo.leave(membership.id);
    await assert.rejects(
      () => repo.leave(membership.id),
      IllegalTransitionError,
    );
  });

  it("acting on a membership that does not exist is a NotFoundError", async () => {
    const repo = createMembershipRepository(db);
    await assert.rejects(() => repo.leave("does-not-exist"), NotFoundError);
  });

  it("restore reverses a kick or leave, and cannot be applied to an active membership", async () => {
    const repo = createMembershipRepository(db);
    const campaign = await createTestCampaign(db);
    const person = await createTestUser(db);
    const membership = await repo.join({
      userId: person.id,
      campaignId: campaign.id,
      source: "registration",
    });
    await repo.kick(membership.id, { reason: "mistake" });

    const restored = await repo.restore(membership.id);
    assert.equal(restored.status, "active");
    assert.equal(restored.endedAt, null);
    assert.equal(restored.endedReason, null);

    await assert.rejects(
      () => repo.restore(membership.id),
      IllegalTransitionError,
    );
  });

  it("classifies current members as new or returning from membership history alone", async () => {
    const campaigns = createCampaignRepository(db);
    const memberships = createMembershipRepository(db);

    const past = await createTestCampaign(db);
    const current = await createTestCampaign(db);
    await campaigns.switchCurrent(current.id);

    const newcomer = await createTestUser(db);
    const veteran = await createTestUser(db);

    // veteran has a row in the past campaign as well as the current one.
    await memberships.join({
      userId: veteran.id,
      campaignId: past.id,
      source: "registration",
    });
    await memberships.join({
      userId: veteran.id,
      campaignId: current.id,
      source: "registration",
    });
    // newcomer only has the current row.
    await memberships.join({
      userId: newcomer.id,
      campaignId: current.id,
      source: "registration",
    });

    const classifications = await memberships.newVsReturningCurrentMembers();
    const byUser = new Map(
      classifications.map((c) => [c.userId, c.classification]),
    );

    assert.equal(byUser.get(newcomer.id), "new");
    assert.equal(byUser.get(veteran.id), "returning");
  });

  it("current members are active rows in whichever campaign is current, and nothing else", async () => {
    const campaigns = createCampaignRepository(db);
    const memberships = createMembershipRepository(db);

    const current = await createTestCampaign(db);
    const other = await createTestCampaign(db);
    await campaigns.switchCurrent(current.id);

    const activeInCurrent = await createTestUser(db);
    const activeInOther = await createTestUser(db);
    await memberships.join({
      userId: activeInCurrent.id,
      campaignId: current.id,
      source: "registration",
    });
    await memberships.join({
      userId: activeInOther.id,
      campaignId: other.id,
      source: "registration",
    });

    const rows = await memberships.currentMembers();
    const userIds = rows.map((r) => r.membership.userId);
    assert.ok(userIds.includes(activeInCurrent.id));
    assert.ok(!userIds.includes(activeInOther.id));
  });

  it("opening the next campaign's registration early does not make its members current", async () => {
    const campaigns = createCampaignRepository(db);
    const memberships = createMembershipRepository(db);

    const current = await createTestCampaign(db);
    const next = await createTestCampaign(db);
    await campaigns.switchCurrent(current.id);
    await campaigns.switchRegistrationOpen(next.id);

    const earlyJoiner = await createTestUser(db);
    await memberships.join({
      userId: earlyJoiner.id,
      campaignId: next.id,
      source: "registration",
    });

    const rows = await memberships.currentMembers();
    assert.ok(!rows.some((r) => r.membership.userId === earlyJoiner.id));
  });

  it("unrenewedPastMembers finds people with no row at all in the current campaign", async () => {
    const campaigns = createCampaignRepository(db);
    const memberships = createMembershipRepository(db);

    const past = await createTestCampaign(db);
    const current = await createTestCampaign(db);
    await campaigns.switchCurrent(current.id);

    const renewed = await createTestUser(db);
    const lapsed = await createTestUser(db);
    await memberships.join({
      userId: renewed.id,
      campaignId: past.id,
      source: "registration",
    });
    await memberships.join({
      userId: renewed.id,
      campaignId: current.id,
      source: "registration",
    });
    await memberships.join({
      userId: lapsed.id,
      campaignId: past.id,
      source: "registration",
    });

    const unrenewed = await memberships.unrenewedPastMembers();
    const userIds = unrenewed.map((r) => r.userId);
    assert.ok(userIds.includes(lapsed.id));
    assert.ok(!userIds.includes(renewed.id));
  });

  it("pastMembers excludes anyone currently active in the current campaign", async () => {
    const campaigns = createCampaignRepository(db);
    const memberships = createMembershipRepository(db);

    const past = await createTestCampaign(db);
    const current = await createTestCampaign(db);
    await campaigns.switchCurrent(current.id);

    const stillCurrent = await createTestUser(db);
    const noLongerActive = await createTestUser(db);
    await memberships.join({
      userId: stillCurrent.id,
      campaignId: current.id,
      source: "registration",
    });
    await memberships.join({
      userId: noLongerActive.id,
      campaignId: past.id,
      source: "registration",
    });

    const pastMembers = await memberships.pastMembers();
    const userIds = pastMembers.map((r) => r.userId);
    assert.ok(userIds.includes(noLongerActive.id));
    assert.ok(!userIds.includes(stillCurrent.id));
  });
});

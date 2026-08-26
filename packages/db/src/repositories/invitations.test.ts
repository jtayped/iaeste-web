import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createTestCampaign,
  createTestUser,
  testProfileSnapshot,
} from "../test-support/fixtures";
import { createInvitationRepository } from "./invitations";
import { createMembershipRepository } from "./memberships";
import { IllegalTransitionError } from "./errors";

describe("invitations repository", () => {
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

  it("accepting an invitation creates the membership directly, no review", async () => {
    const invitations = createInvitationRepository(db);
    const memberships = createMembershipRepository(db);
    const campaign = await createTestCampaign(db);
    const inviter = await createTestUser(db);

    const invitation = await invitations.create({
      campaignId: campaign.id,
      email: "invited@alumnes.udl.cat",
      inviterId: inviter.id,
      tokenHash: "invite-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await invitations.accept(invitation.id, {
      profile: testProfileSnapshot(),
    });
    assert.equal(result.invitation.status, "accepted");
    assert.equal(result.membership.status, "active");

    const membershipRow = await memberships.getForUserAndCampaign(
      result.user.id,
      campaign.id,
    );
    assert.equal(membershipRow?.source, "invitation");
  });

  it("cannot accept the same invitation twice", async () => {
    const invitations = createInvitationRepository(db);
    const campaign = await createTestCampaign(db);
    const inviter = await createTestUser(db);
    const invitation = await invitations.create({
      campaignId: campaign.id,
      email: "invited2@alumnes.udl.cat",
      inviterId: inviter.id,
      tokenHash: "invite-hash-2",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await invitations.accept(invitation.id, { profile: testProfileSnapshot() });
    await assert.rejects(
      () =>
        invitations.accept(invitation.id, { profile: testProfileSnapshot() }),
      IllegalTransitionError,
    );
  });

  it("cancel moves a pending invitation to cancelled", async () => {
    const invitations = createInvitationRepository(db);
    const campaign = await createTestCampaign(db);
    const inviter = await createTestUser(db);
    const invitation = await invitations.create({
      campaignId: campaign.id,
      email: "cancel-me@alumnes.udl.cat",
      inviterId: inviter.id,
      tokenHash: "invite-hash-3",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const cancelled = await invitations.cancel(invitation.id);
    assert.equal(cancelled.status, "cancelled");

    await assert.rejects(
      () =>
        invitations.accept(invitation.id, { profile: testProfileSnapshot() }),
      IllegalTransitionError,
    );
  });

  it("listExpired finds only pending invitations past their expiry", async () => {
    const invitations = createInvitationRepository(db);
    const campaign = await createTestCampaign(db);
    const inviter = await createTestUser(db);

    const expired = await invitations.create({
      campaignId: campaign.id,
      email: "expired@alumnes.udl.cat",
      inviterId: inviter.id,
      tokenHash: "invite-hash-expired",
      expiresAt: new Date(Date.now() - 1000),
    });
    await invitations.create({
      campaignId: campaign.id,
      email: "not-expired@alumnes.udl.cat",
      inviterId: inviter.id,
      tokenHash: "invite-hash-fresh",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const results = await invitations.listExpired();
    assert.equal(results.length, 1);
    assert.equal(results[0]?.id, expired.id);
  });
});

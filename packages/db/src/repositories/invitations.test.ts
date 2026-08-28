import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";

import type { Database } from "../client";
import { user } from "../schema/auth";
import { registration } from "../schema/registration";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createTestCampaign,
  createTestUser,
  testProfileSnapshot,
} from "../test-support/fixtures";
import { createInvitationRepository } from "./invitations";
import { createMembershipRepository } from "./memberships";
import { createRegistrationRepository } from "./registrations";
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

  let seq = 0;
  async function invite(overrides: Record<string, unknown> = {}) {
    seq += 1;
    const invitations = createInvitationRepository(db);
    const campaign = await createTestCampaign(db);
    const inviter = await createTestUser(db);
    const invitation = await invitations.create({
      campaignId: campaign.id,
      email: `invited-${seq}@alumnes.udl.cat`,
      inviterId: inviter.id,
      tokenHash: `hash-${seq}`,
      expiresAt: new Date(Date.now() + 60_000),
      ...overrides,
    });
    return { invitations, campaign, inviter, invitation };
  }

  it("accepting creates the membership and an accepted registration snapshot", async () => {
    const { invitations, campaign, invitation, inviter } = await invite();

    const result = await invitations.accept(invitation.id, {
      profile: testProfileSnapshot({ name: "Berta" }),
    });
    assert.equal(result.invitation.status, "accepted");
    assert.equal(result.alreadyMember, false);
    assert.equal(result.registrationOutcome, "inserted");

    const membershipRow = await createMembershipRepository(
      db,
    ).getForUserAndCampaign(result.user.id, campaign.id);
    assert.equal(membershipRow?.source, "invitation");
    assert.equal(membershipRow?.status, "active");

    const [reg] = await db
      .select()
      .from(registration)
      .where(
        and(
          eq(registration.campaignId, campaign.id),
          eq(registration.email, invitation.email),
        ),
      );
    assert.equal(reg?.status, "accepted");
    assert.equal(reg?.source, "invitation");
    assert.equal(reg?.reviewerId, inviter.id);
    assert.equal((reg?.profileSnapshot as { name: string }).name, "Berta");
  });

  it("applies intendedRole = admin to the user", async () => {
    const { invitations, invitation } = await invite({
      intendedRole: "admin",
    });
    const result = await invitations.accept(invitation.id, {
      profile: testProfileSnapshot(),
    });
    const [row] = await db
      .select()
      .from(user)
      .where(eq(user.id, result.user.id));
    assert.equal(row?.role, "admin");
  });

  it("rejects an expired invitation", async () => {
    const { invitations, invitation } = await invite({
      expiresAt: new Date(Date.now() - 1000),
    });
    await assert.rejects(
      () =>
        invitations.accept(invitation.id, { profile: testProfileSnapshot() }),
      IllegalTransitionError,
    );
  });

  it("cannot accept the same invitation twice", async () => {
    const { invitations, invitation } = await invite();
    await invitations.accept(invitation.id, { profile: testProfileSnapshot() });
    await assert.rejects(
      () =>
        invitations.accept(invitation.id, { profile: testProfileSnapshot() }),
      IllegalTransitionError,
    );
  });

  it("is idempotent when the person is already an active member", async () => {
    const { invitations, campaign, inviter, invitation } = await invite();
    const existing = await createTestUser(db, { email: invitation.email });
    await createMembershipRepository(db).join({
      userId: existing.id,
      campaignId: campaign.id,
      source: "registration",
      actorId: inviter.id,
    });

    const result = await invitations.accept(invitation.id, {
      profile: testProfileSnapshot(),
    });
    assert.equal(result.alreadyMember, true);
    assert.equal(result.user.id, existing.id);
  });

  it("overrides a prior rejected registration and records an event", async () => {
    const { invitations, campaign, inviter, invitation } = await invite();
    const registrations = createRegistrationRepository(db);
    const reg = await registrations.create({
      campaignId: campaign.id,
      email: invitation.email,
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(reg.id);
    await registrations.reject(reg.id, {
      reviewerId: inviter.id,
      reason: "no",
    });

    const result = await invitations.accept(invitation.id, {
      profile: testProfileSnapshot(),
    });
    assert.equal(result.registrationOutcome, "override");
    assert.equal((await registrations.getById(reg.id))?.status, "accepted");
  });

  it("reuses a pending_review registration instead of inserting a second", async () => {
    const { invitations, campaign, invitation } = await invite();
    const registrations = createRegistrationRepository(db);
    const reg = await registrations.create({
      campaignId: campaign.id,
      email: invitation.email,
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(reg.id);

    const result = await invitations.accept(invitation.id, {
      profile: testProfileSnapshot(),
    });
    assert.equal(result.registrationOutcome, "reused");

    const all = await db
      .select()
      .from(registration)
      .where(eq(registration.campaignId, campaign.id));
    assert.equal(all.length, 1);
    assert.equal(all[0]?.status, "accepted");
  });

  it("two concurrent accepts produce exactly one membership", async () => {
    const { invitations, campaign, invitation } = await invite();
    const settled = await Promise.allSettled([
      invitations.accept(invitation.id, { profile: testProfileSnapshot() }),
      invitations.accept(invitation.id, { profile: testProfileSnapshot() }),
    ]);
    const ok = settled.filter((s) => s.status === "fulfilled");
    assert.equal(ok.length, 1);

    const memberships = await db
      .select()
      .from((await import("../schema/membership")).membership)
      .where(
        eq(
          (await import("../schema/membership")).membership.campaignId,
          campaign.id,
        ),
      );
    assert.equal(memberships.length, 1);
  });

  it("cancel blocks a later accept", async () => {
    const { invitations, invitation } = await invite();
    const cancelled = await invitations.cancel(invitation.id);
    assert.equal(cancelled.status, "cancelled");
    await assert.rejects(
      () =>
        invitations.accept(invitation.id, { profile: testProfileSnapshot() }),
      IllegalTransitionError,
    );
  });

  it("rotateToken swaps the token and expiry on the pending row", async () => {
    const { invitations, invitation } = await invite();
    const rotated = await invitations.rotateToken(invitation.id, {
      tokenHash: "new-hash",
      expiresAt: new Date(Date.now() + 120_000),
    });
    assert.equal(rotated.tokenHash, "new-hash");
    assert.ok(await invitations.getByTokenHash("new-hash"));
    assert.equal(await invitations.getByTokenHash("hash-" + seq), undefined);
  });

  it("listByCampaign computes expired at read time", async () => {
    const { invitations, campaign } = await invite({
      expiresAt: new Date(Date.now() - 1000),
    });
    await invitations.create({
      campaignId: campaign.id,
      email: "fresh@alumnes.udl.cat",
      inviterId: (await createTestUser(db)).id,
      tokenHash: `hash-fresh-${seq}`,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const rows = await invitations.listByCampaign(campaign.id);
    assert.equal(rows.length, 2);
    const expired = rows.filter((r) => r.expired);
    assert.equal(expired.length, 1);
  });

  it("listExpired finds only pending invitations past their expiry", async () => {
    const { invitations, campaign, inviter } = await invite({
      expiresAt: new Date(Date.now() - 1000),
    });
    await invitations.create({
      campaignId: campaign.id,
      email: "still-good@alumnes.udl.cat",
      inviterId: inviter.id,
      tokenHash: `hash-good-${seq}`,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const results = await invitations.listExpired();
    assert.equal(results.length, 1);
  });
});

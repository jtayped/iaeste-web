import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { memberProfile } from "../schema/member-profile";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createTestCampaign,
  createTestUser,
  testProfileSnapshot,
} from "../test-support/fixtures";
import { createCampaignRepository } from "./campaigns";
import { createKnownPersonRepository } from "./known-person";
import { createMembershipRepository } from "./memberships";
import { createRegistrationRepository } from "./registrations";

describe("known person repository", () => {
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

  it("says it knows nothing about an address it has never seen", async () => {
    const known = await createKnownPersonRepository(db).lookup(
      "stranger@alumnes.udl.cat",
    );

    assert.deepEqual(known, {
      known: false,
      profile: null,
      memberships: [],
      openCampaignRegistrationStatus: null,
    });
  });

  it("prefers the current profile over an older registration snapshot", async () => {
    const campaign = await createTestCampaign(db);
    const account = await createTestUser(db, {
      email: "member@alumnes.udl.cat",
    });
    await db.insert(memberProfile).values({
      userId: account.id,
      name: "Joana",
      surnames: "Serra Puig",
      phoneE164: "+34623324234",
      phoneDisplay: "623 32 42 34",
      degree: "grau en informàtica (lleida)",
      studyYear: 4,
    });
    await createRegistrationRepository(db).create({
      campaignId: campaign.id,
      email: "member@alumnes.udl.cat",
      // Stale: what they told us a year ago, before the profile existed.
      profileSnapshot: testProfileSnapshot({ studyYear: 1, name: "Jo" }),
    });

    const known = await createKnownPersonRepository(db).lookup(
      "member@alumnes.udl.cat",
    );

    assert.equal(known.known, true);
    assert.equal(known.profile?.name, "Joana");
    assert.equal(known.profile?.year, 4);
    // The display form, not E.164 — the form field shows what a human typed.
    assert.equal(known.profile?.phone, "623 32 42 34");
  });

  it("falls back to the latest registration for someone with no account", async () => {
    const campaign = await createTestCampaign(db);
    await createRegistrationRepository(db).create({
      campaignId: campaign.id,
      email: "applicant@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot({ name: "Marta" }),
    });

    const known = await createKnownPersonRepository(db).lookup(
      "applicant@alumnes.udl.cat",
    );

    assert.equal(known.known, true);
    assert.equal(known.profile?.name, "Marta");
    assert.deepEqual(known.memberships, []);
  });

  it("lists past campaigns newest first", async () => {
    const older = await createTestCampaign(db, {
      label: "2024-2025",
      membershipStartsAt: new Date("2024-09-01T00:00:00Z"),
      membershipEndsAt: new Date("2025-06-30T00:00:00Z"),
    });
    const newer = await createTestCampaign(db, {
      label: "2025-2026",
      membershipStartsAt: new Date("2025-09-01T00:00:00Z"),
      membershipEndsAt: new Date("2026-06-30T00:00:00Z"),
    });
    const account = await createTestUser(db, {
      email: "veteran@alumnes.udl.cat",
    });

    const memberships = createMembershipRepository(db);
    await memberships.join({
      userId: account.id,
      campaignId: older.id,
      source: "registration",
    });
    await memberships.join({
      userId: account.id,
      campaignId: newer.id,
      source: "registration",
    });

    const known = await createKnownPersonRepository(db).lookup(
      "veteran@alumnes.udl.cat",
    );

    assert.deepEqual(
      known.memberships.map((m) => m.campaignLabel),
      ["2025-2026", "2024-2025"],
    );
    assert.equal(known.known, true);
  });

  it("reports an existing registration in the campaign that is open", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setRegistrationOpen(campaign.id);
    await createRegistrationRepository(db).create({
      campaignId: campaign.id,
      email: "applied@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
      status: "pending_review",
    });

    const known = await createKnownPersonRepository(db).lookup(
      "applied@alumnes.udl.cat",
    );

    assert.equal(known.openCampaignRegistrationStatus, "pending_review");
  });

  it("matches an address regardless of the case it was typed in", async () => {
    const campaign = await createTestCampaign(db);
    await createRegistrationRepository(db).create({
      campaignId: campaign.id,
      email: "mixed@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot({ name: "Pau" }),
    });

    const known = await createKnownPersonRepository(db).lookup(
      "  MIXED@Alumnes.UDL.cat ",
    );

    assert.equal(known.profile?.name, "Pau");
  });
});

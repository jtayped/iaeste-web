import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { eq } from "drizzle-orm";

import type { Database } from "../client";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createTestCampaign, createTestUser } from "../test-support/fixtures";
import { createMemberRepository } from "./members";
import { createMembershipRepository } from "./memberships";

describe("member repository — exportForCampaign", () => {
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

  async function join(campaignId: string, surnames: string | null) {
    const u = await createTestUser(db);
    if (surnames !== null) {
      await db.insert(memberProfile).values({
        userId: u.id,
        name: "Nom",
        surnames,
        phoneE164: "+34600111222",
        phoneDisplay: "600 111 222",
        degree: "Grau en Informàtica (Lleida)",
        studyYear: 2,
      });
    }
    await createMembershipRepository(db).join({
      userId: u.id,
      campaignId,
      source: "registration",
    });
    return u;
  }

  it("returns one row per membership, ordered by surname, scoped to the campaign", async () => {
    const a = await createTestCampaign(db, { slug: "a" });
    const b = await createTestCampaign(db, { slug: "b" });
    await join(a.id, "Vidal");
    await join(a.id, "Blanch");
    await join(b.id, "Elsewhere");

    const rows = await createMemberRepository(db).exportForCampaign(a.id);
    assert.deepEqual(
      rows.map((r) => r.surnames),
      ["Blanch", "Vidal"],
    );
    assert.equal(rows[0]!.status, "active");
    assert.equal(rows[0]!.source, "registration");
    assert.ok(rows[0]!.joinedAt instanceof Date);
  });

  it("still exports a membership whose member_profile is missing", async () => {
    const c = await createTestCampaign(db);
    await join(c.id, null);

    const rows = await createMemberRepository(db).exportForCampaign(c.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.name, "");
    assert.equal(rows[0]!.surnames, "");
    assert.ok(rows[0]!.email.length > 0);
    assert.equal(rows[0]!.studyYear, null);
  });

  it("carries the end date and reason for a kicked membership", async () => {
    const c = await createTestCampaign(db);
    const u = await join(c.id, "Marín");
    await db
      .update(membership)
      .set({
        status: "kicked",
        endedAt: new Date("2027-01-01T00:00:00Z"),
        endedReason: "conducta",
      })
      .where(eq(membership.userId, u.id));

    const [row] = await createMemberRepository(db).exportForCampaign(c.id);
    assert.equal(row!.status, "kicked");
    assert.equal(row!.endedReason, "conducta");
    assert.ok(row!.endedAt instanceof Date);
  });
});

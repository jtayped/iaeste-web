import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createTestCampaign, createTestUser } from "../test-support/fixtures";
import { createMembershipRepository } from "./memberships";
import { createMembershipEventRepository } from "./membership-events";

describe("membership events repository", () => {
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

  it("every transition writes exactly one event, newest first", async () => {
    const memberships = createMembershipRepository(db);
    const events = createMembershipEventRepository(db);
    const campaign = await createTestCampaign(db);
    const person = await createTestUser(db);

    const membership = await memberships.join({
      userId: person.id,
      campaignId: campaign.id,
      source: "registration",
    });
    await memberships.kick(membership.id, { reason: "test" });
    await memberships.restore(membership.id);

    const history = await events.listForUser(person.id);
    assert.deepEqual(
      history.map((e) => e.eventType),
      ["restored", "kicked", "joined"],
    );
  });
});

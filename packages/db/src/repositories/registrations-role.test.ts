import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { eq } from "drizzle-orm";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createTestCampaign,
  createTestUser,
  testProfileSnapshot,
} from "../test-support/fixtures";
import { user } from "../schema/auth";
import { createRegistrationRepository } from "./registrations";

/**
 * The role an accepted applicant's account ends up holding.
 *
 * Its own file because it is the guarantee the acceptance email depends on:
 * that email's whole payload is a sign-in button, and `can()` refuses every
 * capability — `admin.access` included — for a role it does not recognise.
 * A null role here means the person we just accepted follows that button,
 * authenticates successfully, and is redirected straight back out.
 *
 * This path inserts the `user` row directly rather than through Better Auth,
 * so the admin plugin's `defaultRole: "member"` never applies and the column
 * has no database default. The value has to be written here.
 */
describe("registration acceptance — account role", () => {
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

  const APPLICANT = "person@alumnes.udl.cat";

  async function pendingReview() {
    const registrations = createRegistrationRepository(db);
    const campaign = await createTestCampaign(db);
    const created = await registrations.create({
      campaignId: campaign.id,
      email: APPLICANT,
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(created.id);
    return created;
  }

  async function roleOf(userId: string) {
    const [row] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId));
    return row?.role;
  }

  it("gives a brand-new account the member role", async () => {
    const registration = await pendingReview();
    const reviewer = await createTestUser(db);

    const result = await createRegistrationRepository(db).accept(
      registration.id,
      { reviewerId: reviewer.id },
    );

    assert.equal(await roleOf(result.user.id), "member");
  });

  it("fills in a null role on an account that already existed", async () => {
    const registration = await pendingReview();
    const reviewer = await createTestUser(db);
    // A past applicant, or an account made before roles were written here.
    const existing = await createTestUser(db, { email: APPLICANT });
    await db.update(user).set({ role: null }).where(eq(user.id, existing.id));

    const result = await createRegistrationRepository(db).accept(
      registration.id,
      { reviewerId: reviewer.id },
    );

    assert.equal(result.user.id, existing.id);
    assert.equal(await roleOf(existing.id), "member");
  });

  it("never demotes an admin by accepting their registration", async () => {
    const registration = await pendingReview();
    const reviewer = await createTestUser(db);
    const existing = await createTestUser(db, { email: APPLICANT });
    await db
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.id, existing.id));

    await createRegistrationRepository(db).accept(registration.id, {
      reviewerId: reviewer.id,
    });

    assert.equal(await roleOf(existing.id), "admin");
  });
});

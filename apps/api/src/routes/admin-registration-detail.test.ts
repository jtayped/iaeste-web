import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import {
  createMembershipRepository,
  createRegistrationRepository,
} from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import {
  createTestCampaign,
  createTestUser,
  testProfileSnapshot,
} from "@repo/db/test-support/fixtures";

import { createApp } from "../app";
import { createStubAuth, quietLogger } from "../test-support/app";
import { createDrizzleRegistrationService } from "../services/registration-service";

function app(
  db: Database,
  reviewerId: string,
  role: "member" | "admin" = "admin",
) {
  return createApp({
    db,
    auth: createStubAuth({ role, id: reviewerId }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createDrizzleRegistrationService({
      emailer: { async send() {} },
      db,
    }),
  });
}

describe("admin registration detail + restore", () => {
  let db: Database;

  before(async () => {
    db = await getTestDb();
  });
  afterEach(async () => {
    await truncateAll(db);
  });
  after(async () => {
    await closeTestDb();
  });

  it("403s a member", async () => {
    const a = app(db, "reviewer_x", "member");
    assert.equal((await a.request("/v1/admin/registrations/x")).status, 403);
    assert.equal(
      (
        await a.request("/v1/admin/registrations/x/restore", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
  });

  it("404s an unknown id", async () => {
    assert.equal(
      (await app(db, "reviewer_x").request("/v1/admin/registrations/nope"))
        .status,
      404,
    );
  });

  it("returns the snapshot, prior memberships, classification and duplicates", async () => {
    const past = await createTestCampaign(db, { slug: "2025-2026" });
    const current = await createTestCampaign(db, { slug: "2026-2027" });
    const registrations = createRegistrationRepository(db);

    const returningUser = await createTestUser(db, {
      email: "returning@alumnes.udl.cat",
    });
    await createMembershipRepository(db).join({
      userId: returningUser.id,
      campaignId: past.id,
      source: "registration",
    });

    const reg = await registrations.create({
      campaignId: current.id,
      email: "returning@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot({ name: "Returning" }),
    });
    // A duplicate registration for the same email in the past campaign.
    await registrations.create({
      campaignId: past.id,
      email: "returning@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });

    const reviewer = await createTestUser(db);
    const res = await app(db, reviewer.id).request(
      `/v1/admin/registrations/${reg.id}`,
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      registration: { email: string };
      existingUserId: string | null;
      priorMemberships: unknown[];
      classification: string;
      duplicateRegistrations: unknown[];
    };
    assert.equal(body.registration.email, "returning@alumnes.udl.cat");
    assert.equal(body.existingUserId, returningUser.id);
    assert.equal(body.priorMemberships.length, 1);
    assert.equal(body.classification, "returning");
    assert.equal(body.duplicateRegistrations.length, 1);
  });

  it("restores a rejected registration to pending_review, once", async () => {
    const campaign = await createTestCampaign(db);
    const reviewer = await createTestUser(db);
    const registrations = createRegistrationRepository(db);
    const reg = await registrations.create({
      campaignId: campaign.id,
      email: "rej@alumnes.udl.cat",
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.markEmailVerified(reg.id);
    await registrations.reject(reg.id, {
      reviewerId: reviewer.id,
      reason: "no places",
    });

    const restore = () =>
      app(db, reviewer.id).request(
        `/v1/admin/registrations/${reg.id}/restore`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      );

    const first = await restore();
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { status: "restored" });
    assert.equal(
      (await registrations.getById(reg.id))?.status,
      "pending_review",
    );

    const second = await restore();
    assert.equal(second.status, 409);
  });
});

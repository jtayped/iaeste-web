import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import { eq } from "drizzle-orm";

import { createRegistrationRepository } from "@repo/db/repositories";
import { membership, registration } from "@repo/db/schema";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import {
  createTestCampaign,
  createTestUser,
  testProfileSnapshot,
} from "@repo/db/test-support/fixtures";

import { createApp } from "../app";
import { createDrizzleRegistrationService } from "../services/registration-service";
import { createStubAuth, quietLogger } from "../test-support/app";
import { createRecordingEmailer } from "../test-support/registrations";

function makeApp(
  db: Database,
  emailer: ReturnType<typeof createRecordingEmailer>,
  role: "member" | "admin" = "admin",
  actorId = "actor_1",
) {
  return createApp({
    db,
    auth: createStubAuth({ role, id: actorId }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createDrizzleRegistrationService({ db, emailer }),
  });
}

function post(a: ReturnType<typeof makeApp>, path: string, body: unknown) {
  return a.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function seedRegistration(
  db: Database,
  campaignId: string,
  name: string,
  overrides: Record<string, unknown> = {},
) {
  const email = `${name.toLowerCase()}@alumnes.udl.cat`;
  const [row] = await db
    .insert(registration)
    .values({
      campaignId,
      email,
      universityEmail: email,
      profileSnapshot: testProfileSnapshot({ name, surnames: "Prova" }),
      source: "public_form",
      status: "pending_review",
      ...overrides,
    })
    .returning();
  return row!;
}

describe("admin bulk accept", () => {
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
    const a = makeApp(db, createRecordingEmailer(), "member");
    assert.equal(
      (await post(a, "/v1/admin/registrations/bulk-accept", {})).status,
      403,
    );
  });

  it("404s an unknown campaign", async () => {
    const a = makeApp(db, createRecordingEmailer());
    const response = await post(a, "/v1/admin/registrations/bulk-accept", {
      campaignId: "nope",
      selection: { mode: "all", excludedRegistrationIds: [] },
    });
    assert.equal(response.status, 404);
  });

  it("accepts every pending row a whole-queue selection names", async () => {
    const campaign = await createTestCampaign(db);
    const actor = await createTestUser(db);
    await seedRegistration(db, campaign.id, "Aina");
    await seedRegistration(db, campaign.id, "Berta");
    const emailer = createRecordingEmailer();
    const a = makeApp(db, emailer, "admin", actor.id);

    const response = await post(a, "/v1/admin/registrations/bulk-accept", {
      campaignId: campaign.id,
      selection: { mode: "all", excludedRegistrationIds: [] },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requested, 2);
    assert.equal(body.accepted, 2);
    assert.equal(body.skipped, 0);
    assert.deepEqual(body.failed, []);
    assert.equal(body.notificationsSent, 2);

    const memberships = await db
      .select()
      .from(membership)
      .where(eq(membership.campaignId, campaign.id));
    assert.equal(memberships.length, 2);

    // One email each, and every one of them the real acceptance template.
    assert.equal(emailer.batched.length, 2);
    for (const email of emailer.batched) {
      assert.match(email.subject, /ja ets membre/);
      assert.match(email.html, /iniciar sessió/i);
    }
  });

  it("honours the rows the operator un-ticked", async () => {
    const campaign = await createTestCampaign(db);
    const actor = await createTestUser(db);
    const aina = await seedRegistration(db, campaign.id, "Aina");
    await seedRegistration(db, campaign.id, "Berta");
    const a = makeApp(db, createRecordingEmailer(), "admin", actor.id);

    const body = await (
      await post(a, "/v1/admin/registrations/bulk-accept", {
        campaignId: campaign.id,
        selection: {
          mode: "all",
          excludedRegistrationIds: [aina.id],
        },
      })
    ).json();

    assert.equal(body.accepted, 1);
    const registrations = createRegistrationRepository(db);
    assert.equal((await registrations.getById(aina.id))!.status, "pending_review");
  });

  it("skips rows that are no longer pending rather than failing the batch", async () => {
    const campaign = await createTestCampaign(db);
    const actor = await createTestUser(db);
    const pending = await seedRegistration(db, campaign.id, "Aina");
    const rejected = await seedRegistration(db, campaign.id, "Berta", {
      status: "rejected",
      rejectionReason: "no hi ha places",
    });
    const unverified = await seedRegistration(db, campaign.id, "Carla", {
      status: "pending_email",
    });
    const a = makeApp(db, createRecordingEmailer(), "admin", actor.id);

    const body = await (
      await post(a, "/v1/admin/registrations/bulk-accept", {
        campaignId: campaign.id,
        selection: {
          mode: "ids",
          registrationIds: [pending.id, rejected.id, unverified.id],
        },
      })
    ).json();

    assert.equal(body.requested, 3);
    assert.equal(body.accepted, 1);
    assert.equal(body.skipped, 2);
    assert.deepEqual(body.failed, []);
  });

  it("refuses ids that belong to another campaign", async () => {
    const target = await createTestCampaign(db, { label: "2026-2027" });
    const other = await createTestCampaign(db, { label: "2025-2026" });
    const actor = await createTestUser(db);
    const outsider = await seedRegistration(db, other.id, "Aina");
    const a = makeApp(db, createRecordingEmailer(), "admin", actor.id);

    const body = await (
      await post(a, "/v1/admin/registrations/bulk-accept", {
        campaignId: target.id,
        selection: { mode: "ids", registrationIds: [outsider.id] },
      })
    ).json();

    assert.equal(body.accepted, 0);
    assert.equal(body.skipped, 1);
    const registrations = createRegistrationRepository(db);
    assert.equal(
      (await registrations.getById(outsider.id))!.status,
      "pending_review",
    );
  });

  it("keeps the memberships when the acceptance emails cannot be sent", async () => {
    const campaign = await createTestCampaign(db);
    const actor = await createTestUser(db);
    await seedRegistration(db, campaign.id, "Aina");
    const a = createApp({
      db,
      auth: createStubAuth({ role: "admin", id: actor.id }),
      hasMemberProfile: async () => true,
      logger: quietLogger,
      registrationService: createDrizzleRegistrationService({
        db,
        emailer: {
          async send() {
            throw new Error("Resend is down");
          },
          async sendBatch(emails) {
            return {
              sent: 0,
              failed: emails.map((email) => ({
                to: email.to,
                reason: "Resend is down",
              })),
            };
          },
        },
      }),
    });

    const body = await (
      await post(a, "/v1/admin/registrations/bulk-accept", {
        campaignId: campaign.id,
        selection: { mode: "all", excludedRegistrationIds: [] },
      })
    ).json();

    // The decision landed in Postgres; only the announcement failed, and it
    // says exactly who was not told so they can be reached by hand.
    assert.equal(body.accepted, 1);
    assert.equal(body.notificationsSent, 0);
    assert.equal(body.notificationsFailed.length, 1);
    const memberships = await db
      .select()
      .from(membership)
      .where(eq(membership.campaignId, campaign.id));
    assert.equal(memberships.length, 1);
  });
});

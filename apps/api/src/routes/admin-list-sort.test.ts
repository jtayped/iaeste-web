import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import {
  createInvitationRepository,
  createMembershipRepository,
  createRegistrationRepository,
} from "@repo/db/repositories";
import { memberProfile } from "@repo/db/schema";
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

/**
 * The `?sort=&dir=` half of the admin list contract, at the route boundary.
 *
 * Each of the four lists proves the same three things: an unknown key is a
 * 422 before any handler runs, a known key reorders the rows, and a request
 * with neither parameter returns exactly what it returned before sorting
 * existed. The last one is what lets each screen migrate on its own.
 */

function makeApp(db: Database) {
  return createApp({
    db,
    auth: createStubAuth({ role: "admin", id: "actor_admin" }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    // The real service, not the stub: these assertions are about the SQL the
    // repository emits, which a stub returning `rows: []` would hide.
    registrationService: createDrizzleRegistrationService({
      db,
      emailer: createRecordingEmailer(),
    }),
  });
}

async function json(res: Response): Promise<{ rows: { id?: string }[] }> {
  return (await res.json()) as { rows: { id?: string }[] };
}

describe("admin lists — sort and dir", () => {
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

  async function seedMembers() {
    const campaign = await createTestCampaign(db);
    for (const [name, surnames] of [
      ["Carla", "Ferrer"],
      ["Anna", "Roca"],
      ["Berta", "Domingo"],
    ] as const) {
      const u = await createTestUser(db);
      await db.insert(memberProfile).values({
        userId: u.id,
        name,
        surnames,
        phoneE164: "+34600111222",
        phoneDisplay: "600 111 222",
        degree: "grau en informàtica (lleida)",
        studyYear: 3,
      });
      await createMembershipRepository(db).join({
        userId: u.id,
        campaignId: campaign.id,
        source: "registration",
      });
    }
    return campaign;
  }

  it("422s an unknown sort key on every list", async () => {
    const campaign = await createTestCampaign(db);
    const a = makeApp(db);

    for (const path of [
      "/v1/admin/members?sort=bogus",
      `/v1/admin/registrations?campaignId=${campaign.id}&sort=bogus`,
      `/v1/admin/invitations?campaignId=${campaign.id}&sort=bogus`,
      "/v1/admin/campaigns?sort=bogus",
    ]) {
      assert.equal((await a.request(path)).status, 422, path);
    }
  });

  it("422s a direction that is not asc or desc", async () => {
    const a = makeApp(db);
    assert.equal(
      (await a.request("/v1/admin/members?dir=sideways")).status,
      422,
    );
  });

  it("orders members by nom and by cognoms independently", async () => {
    await seedMembers();
    const a = makeApp(db);

    const byName = (await (
      await a.request("/v1/admin/members?sort=name&dir=asc")
    ).json()) as { rows: { name: string }[] };
    assert.deepEqual(
      byName.rows.map((row) => row.name),
      ["Anna", "Berta", "Carla"],
    );

    const bySurnames = (await (
      await a.request("/v1/admin/members?sort=surnames&dir=asc")
    ).json()) as { rows: { surnames: string }[] };
    assert.deepEqual(
      bySurnames.rows.map((row) => row.surnames),
      ["Domingo", "Ferrer", "Roca"],
    );
  });

  it("reverses the member list exactly on dir=desc", async () => {
    await seedMembers();
    const a = makeApp(db);

    const asc = (await (
      await a.request("/v1/admin/members?sort=surnames&dir=asc")
    ).json()) as { rows: { userId: string }[] };
    const desc = (await (
      await a.request("/v1/admin/members?sort=surnames&dir=desc")
    ).json()) as { rows: { userId: string }[] };
    assert.deepEqual(
      desc.rows.map((row) => row.userId),
      [...asc.rows.map((row) => row.userId)].reverse(),
    );
  });

  it("returns the pre-sort order when neither parameter is given", async () => {
    // The backward-compatibility assertion: the API ships ahead of the
    // screens, so a client that knows nothing about sorting is unaffected.
    const campaign = await seedMembers();
    const registrations = createRegistrationRepository(db);
    await registrations.create({
      campaignId: campaign.id,
      email: "one@example.org",
      profileSnapshot: testProfileSnapshot(),
    });
    await registrations.create({
      campaignId: campaign.id,
      email: "two@example.org",
      profileSnapshot: testProfileSnapshot(),
    });
    const inviter = await createTestUser(db);
    const invitations = createInvitationRepository(db);
    for (const seq of [1, 2]) {
      await invitations.create({
        campaignId: campaign.id,
        email: `invited-${seq}@alumnes.udl.cat`,
        inviterId: inviter.id,
        tokenHash: `hash-${seq}`,
        expiresAt: new Date(Date.now() + 60_000),
      });
    }
    const a = makeApp(db);

    const cases: [string, string][] = [
      ["/v1/admin/members", "/v1/admin/members?sort=surnames&dir=asc"],
      [
        `/v1/admin/registrations?campaignId=${campaign.id}`,
        `/v1/admin/registrations?campaignId=${campaign.id}&sort=createdAt&dir=desc`,
      ],
      [
        `/v1/admin/invitations?campaignId=${campaign.id}`,
        `/v1/admin/invitations?campaignId=${campaign.id}&sort=createdAt&dir=desc`,
      ],
      [
        "/v1/admin/campaigns",
        "/v1/admin/campaigns?sort=membershipStartsAt&dir=desc",
      ],
    ];

    for (const [implicitPath, explicitPath] of cases) {
      const implicit = await json(await a.request(implicitPath));
      const explicit = await json(await a.request(explicitPath));
      assert.ok(implicit.rows.length > 0, implicitPath);
      assert.deepEqual(implicit.rows, explicit.rows, implicitPath);
    }
  });

  it("keeps the members page size at 25 without a limit", async () => {
    // The default moved out of the handler and into the shared schema; it
    // must still be the 25 this screen has always used.
    await seedMembers();
    const a = makeApp(db);
    const body = (await (await a.request("/v1/admin/members")).json()) as {
      limit: number;
      offset: number;
    };
    assert.equal(body.limit, 25);
    assert.equal(body.offset, 0);
  });
});

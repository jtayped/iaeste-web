import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import { createCampaignRepository } from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import {
  createTestCampaign,
  createTestUser,
} from "@repo/db/test-support/fixtures";

import { createApp } from "../app";
import { createStubAuth, quietLogger } from "../test-support/app";
import { createInvitationService } from "../services/invitation-service";

function makeApp(
  db: Database,
  role: "member" | "admin" = "admin",
  actorId = "actor_1",
) {
  return createApp({
    db,
    auth: createStubAuth({ role, id: actorId }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    invitationService: createInvitationService({
      db,
      emailer: { async send() {} },
    }),
  });
}

function post(a: ReturnType<typeof makeApp>, path: string, body?: unknown) {
  return a.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

describe("admin + public invitations routes", () => {
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

  it("403s a member on the admin invitation routes", async () => {
    const a = makeApp(db, "member");
    assert.equal(
      (await a.request("/v1/admin/invitations?campaignId=x")).status,
      403,
    );
    assert.equal((await post(a, "/v1/admin/invitations", {})).status, 403);
  });

  it("creates, lists, resends and cancels an invitation", async () => {
    const campaign = await createTestCampaign(db);
    const actor = await createTestUser(db);
    const a = makeApp(db, "admin", actor.id);

    const created = await post(a, "/v1/admin/invitations", {
      campaignId: campaign.id,
      email: "nou@alumnes.udl.cat",
      prefillName: "Nova",
    });
    assert.equal(created.status, 201);
    const inv = (await created.json()) as {
      id: string;
      status: string;
      expired: boolean;
    };
    assert.equal(inv.status, "pending");
    assert.equal(inv.expired, false);

    const list = await a.request(
      `/v1/admin/invitations?campaignId=${campaign.id}`,
    );
    assert.equal(list.status, 200);
    assert.equal(
      ((await list.json()) as { rows: unknown[]; total: number }).total,
      1,
    );

    // A duplicate pending invite is refused.
    const dup = await post(a, "/v1/admin/invitations", {
      campaignId: campaign.id,
      email: "nou@alumnes.udl.cat",
    });
    assert.equal(dup.status, 409);

    assert.equal(
      (await post(a, `/v1/admin/invitations/${inv.id}/resend`)).status,
      200,
    );
    assert.equal(
      (await post(a, `/v1/admin/invitations/${inv.id}/cancel`)).status,
      200,
    );
    // Cancelled → not pending → resend 409.
    assert.equal(
      (await post(a, `/v1/admin/invitations/${inv.id}/resend`)).status,
      409,
    );
  });

  it("requires allowExternalDomain for a non-udl address", async () => {
    const campaign = await createTestCampaign(db);
    const actor = await createTestUser(db);
    const a = makeApp(db, "admin", actor.id);

    const blocked = await post(a, "/v1/admin/invitations", {
      campaignId: campaign.id,
      email: "someone@gmail.com",
    });
    assert.equal(blocked.status, 409);

    const allowed = await post(a, "/v1/admin/invitations", {
      campaignId: campaign.id,
      email: "someone@gmail.com",
      allowExternalDomain: true,
    });
    assert.equal(allowed.status, 201);
  });

  it("lookup and accept complete onboarding from the token", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setCurrent(campaign.id);
    const actor = await createTestUser(db);

    // Reach into the service to get the raw token: create through it and
    // read the row, then forge the lookup like the email link would.
    const service = createInvitationService({
      db,
      emailer: { async send() {} },
    });
    // Capture the link the email would carry.
    let sentLink = "";
    const capturing = createInvitationService({
      db,
      emailer: {
        async send(message) {
          const html = JSON.stringify(message.react);
          const match = html.match(/convit#token=([a-f0-9]+)/);
          if (match) sentLink = match[1] ?? "";
        },
      },
    });
    await capturing.create({
      campaignId: campaign.id,
      email: "convidada@alumnes.udl.cat",
      inviterId: actor.id,
      intendedRole: "member",
      prefillName: "Convidada",
      prefillSurnames: null,
    });
    assert.ok(sentLink, "the invitation email should carry a token");

    const app = makeApp(db);
    const lookup = await post(app, "/v1/invitations/lookup", {
      token: sentLink,
    });
    assert.equal(lookup.status, 200);
    const looked = (await lookup.json()) as {
      email: string;
      prefillName: string;
    };
    assert.equal(looked.email, "convidada@alumnes.udl.cat");
    assert.equal(looked.prefillName, "Convidada");

    const accept = await post(app, "/v1/invitations/accept", {
      token: sentLink,
      name: "Convidada",
      surnames: "Cognom",
      phone: "+34 623 32 42 34",
      degree: "grau en informàtica (lleida)",
      year: 3,
    });
    assert.equal(accept.status, 200);
    assert.deepEqual(await accept.json(), {
      status: "accepted",
      alreadyMember: false,
    });

    // The token is now single-use.
    const reLookup = await post(app, "/v1/invitations/lookup", {
      token: sentLink,
    });
    assert.equal(reLookup.status, 400);
    void service;
  });

  it("gives a generic 400 for an unknown lookup token", async () => {
    const res = await post(makeApp(db), "/v1/invitations/lookup", {
      token: "deadbeef",
    });
    assert.equal(res.status, 400);
  });
});

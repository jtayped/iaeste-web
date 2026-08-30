import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import {
  createCampaignRepository,
  createMembershipRepository,
} from "@repo/db/repositories";
import { memberProfile } from "@repo/db/schema";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import {
  createTestCampaign,
  createTestUser,
} from "@repo/db/test-support/fixtures";

import { createApp } from "../app";
import {
  createRegistrationServiceStub,
  createStubAuth,
  quietLogger,
} from "../test-support/app";

function makeApp(db: Database, role: "member" | "admin" = "admin") {
  return createApp({
    db,
    auth: createStubAuth({ role, id: "actor_admin" }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createRegistrationServiceStub(),
  });
}

async function seedMember(db: Database, campaignId: string, surnames: string) {
  const u = await createTestUser(db);
  await db.insert(memberProfile).values({
    userId: u.id,
    name: "Anna",
    surnames,
    phoneE164: "+34600111222",
    phoneDisplay: "600 111 222",
    degree: "grau en informàtica (lleida)",
    studyYear: 3,
  });
  await createMembershipRepository(db).join({
    userId: u.id,
    campaignId,
    source: "registration",
  });
  return u;
}

describe("GET /v1/admin/members/export", () => {
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

  it("403s a non-admin", async () => {
    const res = await makeApp(db, "member").request("/v1/admin/members/export");
    assert.equal(res.status, 403);
  });

  it("exports the current campaign as CSV when no campaignId is given", async () => {
    const campaign = await createTestCampaign(db, { slug: "2026-2027" });
    await createCampaignRepository(db).setCurrent(campaign.id);
    await seedMember(db, campaign.id, "Puig");
    await seedMember(db, campaign.id, "Alsina");

    const res = await makeApp(db).request("/v1/admin/members/export");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
    assert.match(
      res.headers.get("content-disposition") ?? "",
      /filename="membres-2026-2027\.csv"/,
    );
    const body = await res.text();
    const lines = body
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");
    assert.equal(
      lines[0],
      "nom,cognoms,correu,telèfon,estudis,curs,rol,estat,origen,alta,baixa,motiu de baixa",
    );
    assert.equal(lines.length, 3);
    // ordered by surname
    assert.match(lines[1]!, /^Anna,Alsina,/);
    assert.match(lines[2]!, /^Anna,Puig,/);
  });

  it("exports a specific past campaign by id", async () => {
    const past = await createTestCampaign(db, { slug: "2024-2025" });
    const current = await createTestCampaign(db, { slug: "2026-2027" });
    await createCampaignRepository(db).setCurrent(current.id);
    await seedMember(db, past.id, "Roca");

    const res = await makeApp(db).request(
      `/v1/admin/members/export?campaignId=${past.id}`,
    );
    assert.equal(res.status, 200);
    const lines = (await res.text())
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");
    assert.equal(lines.length, 2);
    assert.match(lines[1]!, /Roca/);
  });

  it("404s an unknown campaignId", async () => {
    const res = await makeApp(db).request(
      "/v1/admin/members/export?campaignId=nope",
    );
    assert.equal(res.status, 404);
  });

  it("409s when nothing is current and no campaignId is given", async () => {
    const res = await makeApp(db).request("/v1/admin/members/export");
    assert.equal(res.status, 409);
  });
});

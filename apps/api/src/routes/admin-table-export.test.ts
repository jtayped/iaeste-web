import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import {
  createCampaignRepository,
  createInvitationRepository,
} from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import {
  createTestCampaign,
  createTestUser,
} from "@repo/db/test-support/fixtures";

import { createApp } from "../app";
import { createInvitationService } from "../services/invitation-service";
import { createDrizzleRegistrationService } from "../services/registration-service";
import { createStubAuth, quietLogger } from "../test-support/app";
import { seedMember, seedRegistration } from "../test-support/broadcasts";

function makeApp(db: Database, role: "member" | "admin" = "admin") {
  const emailer = {
    async send() {},
    async sendBatch() {
      return { sent: 0, failed: [] };
    },
  };
  return createApp({
    db,
    auth: createStubAuth({ role, id: "actor_admin" }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createDrizzleRegistrationService({ db, emailer }),
    invitationService: createInvitationService({ db, emailer }),
  });
}

/** The test values contain no commas or quotes, so a plain split is enough. */
async function readCsv(res: Response): Promise<string[][]> {
  const text = (await res.text()).replace(/^\uFEFF/, "").trimEnd();
  return text.split("\r\n").map((line) => line.split(","));
}

function column(table: string[][], header: string): string[] {
  const index = table[0]!.indexOf(header);
  assert.notEqual(index, -1, `no "${header}" column in ${table[0]!.join(",")}`);
  return table.slice(1).map((row) => row[index]!);
}

describe("admin list exports", () => {
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

  describe("GET /v1/admin/members/export", () => {
    it("403s a role without members.read", async () => {
      const res = await makeApp(db, "member").request(
        "/v1/admin/members/export",
      );
      assert.equal(res.status, 403);
    });

    it("exports every matching member, not one page of them", async () => {
      const campaign = await createTestCampaign(db, { slug: "2026-2027" });
      // More than the list's default page of 25.
      for (let i = 0; i < 30; i += 1) {
        await seedMember(
          db,
          campaign.id,
          `Persona${String(i).padStart(2, "0")}`,
        );
      }

      const res = await makeApp(db).request("/v1/admin/members/export");
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") ?? "", /^text\/csv/);
      const table = await readCsv(res);
      assert.deepEqual(table[0], [
        "nom",
        "cognoms",
        "correu",
        "telèfon",
        "estudis",
        "any de carrera",
        "rol",
        "estat actual",
        "campanyes",
      ]);
      assert.equal(table.length, 31);
      assert.equal(column(table, "telèfon")[0], "600 111 222");
    });

    it("applies the list's search and ordering", async () => {
      const campaign = await createTestCampaign(db);
      await seedMember(db, campaign.id, "Berta");
      await seedMember(db, campaign.id, "Bernat");
      await seedMember(db, campaign.id, "Carla");

      const res = await makeApp(db).request(
        "/v1/admin/members/export?q=ber&sort=name&dir=desc",
      );
      assert.deepEqual(column(await readCsv(res), "nom"), ["Berta", "Bernat"]);
    });

    it("names the file after the source campaign and 404s an unknown one", async () => {
      const campaign = await createTestCampaign(db, { slug: "2025-2026" });
      await seedMember(db, campaign.id, "Anna");

      const ok = await makeApp(db).request(
        `/v1/admin/members/export?campaignId=${campaign.id}`,
      );
      assert.match(
        ok.headers.get("content-disposition") ?? "",
        /^attachment; filename="membres-2025-2026-\d{4}-\d{2}-\d{2}\.csv"$/,
      );

      const missing = await makeApp(db).request(
        "/v1/admin/members/export?campaignId=nope",
      );
      assert.equal(missing.status, 404);
    });

    it("adds the destí column only with a target campaign", async () => {
      const past = await createTestCampaign(db);
      const next = await createTestCampaign(db);
      await seedMember(db, past.id, "Anna");

      const plain = await readCsv(
        await makeApp(db).request("/v1/admin/members/export"),
      );
      assert.equal(plain[0]!.includes("destí"), false);

      const targeted = await readCsv(
        await makeApp(db).request(
          `/v1/admin/members/export?targetCampaignId=${next.id}`,
        ),
      );
      assert.deepEqual(column(targeted, "destí"), ["per convidar"]);
    });
  });

  describe("GET /v1/admin/registrations/export", () => {
    it("422s without a campaignId", async () => {
      const res = await makeApp(db).request("/v1/admin/registrations/export");
      assert.equal(res.status, 422);
    });

    it("404s an unknown campaign", async () => {
      const res = await makeApp(db).request(
        "/v1/admin/registrations/export?campaignId=nope",
      );
      assert.equal(res.status, 404);
    });

    it("exports the status the table filtered by, with Catalan labels", async () => {
      const campaign = await createTestCampaign(db, { slug: "2026-2027" });
      await seedRegistration(db, campaign.id, "Anna");
      await seedRegistration(db, campaign.id, "Pau", { status: "rejected" });

      const all = await makeApp(db).request(
        `/v1/admin/registrations/export?campaignId=${campaign.id}&sort=name&dir=asc`,
      );
      assert.equal(all.status, 200);
      assert.match(
        all.headers.get("content-disposition") ?? "",
        /filename="sollicituds-2026-2027-\d{4}-\d{2}-\d{2}\.csv"/,
      );
      const table = await readCsv(all);
      assert.deepEqual(column(table, "nom"), ["Anna", "Pau"]);
      assert.deepEqual(column(table, "estat"), ["per revisar", "rebutjada"]);

      const pending = await readCsv(
        await makeApp(db).request(
          `/v1/admin/registrations/export?campaignId=${campaign.id}&status=pending_review`,
        ),
      );
      assert.deepEqual(column(pending, "nom"), ["Anna"]);
    });
  });

  describe("GET /v1/admin/invitations/export", () => {
    it("403s a role without invitations.write", async () => {
      const campaign = await createTestCampaign(db);
      const res = await makeApp(db, "member").request(
        `/v1/admin/invitations/export?campaignId=${campaign.id}`,
      );
      assert.equal(res.status, 403);
    });

    it("labels a pending invitation past its expiry as caducat", async () => {
      const campaign = await createTestCampaign(db);
      const inviter = await createTestUser(db);
      const invitations = createInvitationRepository(db);
      await invitations.create({
        campaignId: campaign.id,
        email: "vell@alumnes.udl.cat",
        inviterId: inviter.id,
        tokenHash: "a".repeat(64),
        expiresAt: new Date("2020-01-01T00:00:00Z"),
      });
      await invitations.create({
        campaignId: campaign.id,
        email: "nou@alumnes.udl.cat",
        inviterId: inviter.id,
        tokenHash: "b".repeat(64),
        expiresAt: new Date("2099-01-01T00:00:00Z"),
      });

      const table = await readCsv(
        await makeApp(db).request(
          `/v1/admin/invitations/export?campaignId=${campaign.id}&sort=email&dir=asc`,
        ),
      );
      assert.deepEqual(column(table, "correu"), [
        "nou@alumnes.udl.cat",
        "vell@alumnes.udl.cat",
      ]);
      assert.deepEqual(column(table, "estat"), ["pendent", "caducat"]);

      const expired = await readCsv(
        await makeApp(db).request(
          `/v1/admin/invitations/export?campaignId=${campaign.id}&status=expired`,
        ),
      );
      assert.deepEqual(column(expired, "correu"), ["vell@alumnes.udl.cat"]);
    });
  });

  describe("GET /v1/admin/campaigns/export", () => {
    it("exports the filtered campaigns with their flags as sí/no", async () => {
      const current = await createTestCampaign(db, {
        slug: "2026-2027",
        label: "Curs 2026-2027",
      });
      await createCampaignRepository(db).setCurrent(current.id);
      await createTestCampaign(db, {
        slug: "2025-2026",
        label: "Curs 2025-2026",
      });

      const res = await makeApp(db).request(
        "/v1/admin/campaigns/export?sort=slug&dir=desc",
      );
      assert.equal(res.status, 200);
      assert.match(
        res.headers.get("content-disposition") ?? "",
        /filename="campanyes-\d{4}-\d{2}-\d{2}\.csv"/,
      );
      const table = await readCsv(res);
      assert.deepEqual(column(table, "identificador"), [
        "2026-2027",
        "2025-2026",
      ]);
      assert.deepEqual(column(table, "actual"), ["sí", "no"]);
      assert.deepEqual(column(table, "estat"), ["esborrany", "esborrany"]);

      const searched = await readCsv(
        await makeApp(db).request("/v1/admin/campaigns/export?q=2025"),
      );
      assert.deepEqual(column(searched, "identificador"), ["2025-2026"]);
    });
  });
});

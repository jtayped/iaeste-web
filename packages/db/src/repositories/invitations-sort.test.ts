import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { INVITATION_SORT_KEYS } from "@repo/constants/validators/admin-list";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createTestCampaign, createTestUser } from "../test-support/fixtures";
import { createInvitationRepository } from "./invitations";

describe("invitations — admin list ordering", () => {
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

  let seq = 0;
  async function seed() {
    const repo = createInvitationRepository(db);
    const campaign = await createTestCampaign(db);
    const inviter = await createTestUser(db);

    async function invite(
      overrides: Partial<Parameters<typeof repo.create>[0]> = {},
    ) {
      seq += 1;
      return repo.create({
        campaignId: campaign.id,
        email: `invited-${seq}@alumnes.udl.cat`,
        inviterId: inviter.id,
        tokenHash: `hash-${seq}`,
        expiresAt: new Date(Date.now() + 60_000),
        ...overrides,
      });
    }

    return { repo, campaign, invite };
  }

  it("sorts the prefill name with empty ones last in both directions", async () => {
    // Most invitations are just an address. Postgres would put the blanks
    // first on `desc`, which opens the reversed table with a screen of "—".
    const { repo, campaign, invite } = await seed();
    await invite({ prefillName: "Berta", prefillSurnames: "Domingo" });
    await invite({ prefillName: null, prefillSurnames: null });
    await invite({ prefillName: "Anna", prefillSurnames: "Roca" });

    for (const dir of ["asc", "desc"] as const) {
      const page = await repo.listPageForCampaign({
        campaignId: campaign.id,
        sort: "name",
        dir,
        limit: 10,
        offset: 0,
      });
      assert.equal(
        page.rows[2]?.prefillName,
        null,
        `the unnamed invitation is last on dir=${dir}`,
      );
    }
  });

  it("computes expired on the database's clock, not the process's", async () => {
    const { repo, campaign, invite } = await seed();
    await invite({ expiresAt: new Date(Date.now() - 60_000) });
    await invite({ expiresAt: new Date(Date.now() + 60_000) });

    const page = await repo.listPageForCampaign({
      campaignId: campaign.id,
      limit: 10,
      offset: 0,
    });
    assert.deepEqual(page.rows.map((row) => row.expired).sort(), [false, true]);

    // The row flag and the `expired` filter must agree — they used to read
    // two different clocks, so a row that lapsed between them showed a
    // "pendent" badge on the "caducades" tab.
    const expiredOnly = await repo.listPageForCampaign({
      campaignId: campaign.id,
      status: "expired",
      limit: 10,
      offset: 0,
    });
    assert.equal(expiredOnly.rows.length, 1);
    assert.equal(expiredOnly.rows[0]?.expired, true);
  });

  it("defaults to newest first", async () => {
    const { repo, campaign, invite } = await seed();
    await invite();
    await invite();

    const implicit = await repo.listPageForCampaign({
      campaignId: campaign.id,
      limit: 10,
      offset: 0,
    });
    const explicit = await repo.listPageForCampaign({
      campaignId: campaign.id,
      sort: "createdAt",
      dir: "desc",
      limit: 10,
      offset: 0,
    });
    assert.deepEqual(
      implicit.rows.map((row) => row.id),
      explicit.rows.map((row) => row.id),
    );
  });

  it("produces valid SQL for every key the contract declares", async () => {
    const { repo, campaign, invite } = await seed();
    await invite({ prefillName: "Anna", prefillSurnames: "Roca" });
    await invite();

    for (const sort of INVITATION_SORT_KEYS) {
      for (const dir of ["asc", "desc"] as const) {
        const page = await repo.listPageForCampaign({
          campaignId: campaign.id,
          sort,
          dir,
          limit: 10,
          offset: 0,
        });
        assert.equal(page.rows.length, 2, `sort=${sort} dir=${dir}`);
      }
    }
  });
});

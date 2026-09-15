import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { REGISTRATION_SORT_KEYS } from "@repo/constants/validators/admin-list";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createTestCampaign,
  testProfileSnapshot,
} from "../test-support/fixtures";
import {
  createRegistrationRepository,
  type RegistrationProfileSnapshot,
} from "./registrations";

/** The column is JSONB, so Drizzle infers `unknown`; the writer owns its shape. */
function snapshot(row: {
  profileSnapshot: unknown;
}): RegistrationProfileSnapshot {
  return row.profileSnapshot as RegistrationProfileSnapshot;
}

describe("registrations — admin list ordering", () => {
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

  async function seed() {
    const campaign = await createTestCampaign(db);
    const repo = createRegistrationRepository(db);
    // Deliberately created in an order that matches neither name nor surname.
    await repo.create({
      campaignId: campaign.id,
      email: "carla@example.org",
      profileSnapshot: testProfileSnapshot({
        name: "Carla",
        surnames: "Ferrer",
        studyYear: 2,
      }),
    });
    await repo.create({
      campaignId: campaign.id,
      email: "anna@example.org",
      profileSnapshot: testProfileSnapshot({
        name: "Anna",
        surnames: "Roca",
        studyYear: 10,
      }),
    });
    await repo.create({
      campaignId: campaign.id,
      email: "berta@example.org",
      profileSnapshot: testProfileSnapshot({
        name: "Berta",
        surnames: "Domingo",
        studyYear: 1,
      }),
    });
    return { campaign, repo };
  }

  it("sorts by the snapshot's nom and cognoms independently", async () => {
    const { campaign, repo } = await seed();

    const byName = await repo.listForAdmin({
      campaignId: campaign.id,
      sort: "name",
      dir: "asc",
      limit: 10,
      offset: 0,
    });
    assert.deepEqual(
      byName.rows.map((row) => snapshot(row).name),
      ["Anna", "Berta", "Carla"],
    );

    const bySurnames = await repo.listForAdmin({
      campaignId: campaign.id,
      sort: "surnames",
      dir: "asc",
      limit: 10,
      offset: 0,
    });
    assert.deepEqual(
      bySurnames.rows.map((row) => snapshot(row).surnames),
      ["Domingo", "Ferrer", "Roca"],
    );
  });

  it("sorts studyYear as a number, not as text", async () => {
    // The snapshot is JSONB, so `->>` yields text: without the cast, "10"
    // sorts between "1" and "2".
    const { campaign, repo } = await seed();

    const page = await repo.listForAdmin({
      campaignId: campaign.id,
      sort: "studyYear",
      dir: "asc",
      limit: 10,
      offset: 0,
    });
    assert.deepEqual(
      page.rows.map((row) => snapshot(row).studyYear),
      [1, 2, 10],
    );
  });

  it("defaults to newest first", async () => {
    const { campaign, repo } = await seed();

    const implicit = await repo.listForAdmin({
      campaignId: campaign.id,
      limit: 10,
      offset: 0,
    });
    const explicit = await repo.listForAdmin({
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
    const { campaign, repo } = await seed();

    for (const sort of REGISTRATION_SORT_KEYS) {
      for (const dir of ["asc", "desc"] as const) {
        const page = await repo.listForAdmin({
          campaignId: campaign.id,
          sort,
          dir,
          limit: 10,
          offset: 0,
        });
        assert.equal(page.rows.length, 3, `sort=${sort} dir=${dir}`);
      }
    }
  });
});

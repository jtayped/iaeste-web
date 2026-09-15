import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { CAMPAIGN_SORT_KEYS } from "@repo/constants/validators/admin-list";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createTestCampaign } from "../test-support/fixtures";
import { createCampaignRepository } from "./campaigns";

describe("campaigns — admin list ordering", () => {
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
    await createTestCampaign(db, {
      slug: "b-middle",
      label: "Bravo",
      membershipStartsAt: new Date("2025-09-01T00:00:00Z"),
      membershipEndsAt: new Date("2026-06-30T00:00:00Z"),
    });
    await createTestCampaign(db, {
      slug: "a-oldest",
      label: "Alfa",
      membershipStartsAt: new Date("2024-09-01T00:00:00Z"),
      membershipEndsAt: new Date("2025-06-30T00:00:00Z"),
    });
    await createTestCampaign(db, {
      slug: "c-newest",
      label: "Charlie",
      membershipStartsAt: new Date("2026-09-01T00:00:00Z"),
      membershipEndsAt: new Date("2027-06-30T00:00:00Z"),
    });
    return createCampaignRepository(db);
  }

  it("sorts by label and by slug independently", async () => {
    const repo = await seed();

    const byLabel = await repo.listWithCounts({
      sort: "label",
      dir: "asc",
      limit: 10,
      offset: 0,
    });
    assert.deepEqual(
      byLabel.rows.map((row) => row.label),
      ["Alfa", "Bravo", "Charlie"],
    );

    const bySlug = await repo.listWithCounts({
      sort: "slug",
      dir: "desc",
      limit: 10,
      offset: 0,
    });
    assert.deepEqual(
      bySlug.rows.map((row) => row.slug),
      ["c-newest", "b-middle", "a-oldest"],
    );
  });

  it("defaults to the newest membership start", async () => {
    const repo = await seed();

    const implicit = await repo.listWithCounts({ limit: 10, offset: 0 });
    assert.deepEqual(
      implicit.rows.map((row) => row.slug),
      ["c-newest", "b-middle", "a-oldest"],
    );
  });

  it("produces valid SQL for every key the contract declares", async () => {
    // Includes the two count columns, which order by the very correlated
    // subqueries the table renders.
    const repo = await seed();

    for (const sort of CAMPAIGN_SORT_KEYS) {
      for (const dir of ["asc", "desc"] as const) {
        const page = await repo.listWithCounts({
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

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { CAMPAIGN_SORT_KEYS } from "@repo/constants/validators/admin-list";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createTestCampaign, createTestUser } from "../test-support/fixtures";
import { createCampaignRepository } from "./campaigns";
import { createMembershipRepository } from "./memberships";

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

  it("counts the members and pending reviews each campaign actually has", async () => {
    // Regression. These counts were hand-written `sql` subqueries, and inside
    // a select field drizzle renders an interpolated column unqualified: the
    // condition came out as `membership.campaign_id = membership.id`, which is
    // never true, so every campaign reported zero. The admin's campanyes table
    // showed 0 members for a committee of thirty. Asserting the row count is
    // not enough — this asserts the numbers.
    const repo = await seed();
    const { rows } = await repo.listWithCounts({ limit: 10, offset: 0 });
    const newest = rows.find((row) => row.slug === "c-newest");
    assert.ok(newest);

    const memberships = createMembershipRepository(db);
    for (let i = 0; i < 3; i += 1) {
      const u = await createTestUser(db);
      await memberships.join({
        userId: u.id,
        campaignId: newest.id,
        source: "registration",
      });
    }

    const after = await repo.listWithCounts({ limit: 10, offset: 0 });
    assert.equal(
      after.rows.find((row) => row.slug === "c-newest")?.activeMembers,
      3,
    );
    assert.equal(
      after.rows.find((row) => row.slug === "a-oldest")?.activeMembers,
      0,
      "a campaign nobody joined still reports zero",
    );
  });

  it("actually orders by a count, rather than by a constant", async () => {
    // The sort keys order by the same expression the column renders, so a
    // broken count is a sort that silently does nothing.
    const repo = await seed();
    const { rows } = await repo.listWithCounts({ limit: 10, offset: 0 });
    const memberships = createMembershipRepository(db);
    const middle = rows.find((row) => row.slug === "b-middle");
    assert.ok(middle);
    for (let i = 0; i < 2; i += 1) {
      const u = await createTestUser(db);
      await memberships.join({
        userId: u.id,
        campaignId: middle.id,
        source: "registration",
      });
    }

    const byCount = await repo.listWithCounts({
      sort: "activeMembers",
      dir: "desc",
      limit: 10,
      offset: 0,
    });
    assert.equal(
      byCount.rows[0]?.slug,
      "b-middle",
      "the only campaign with members sorts to the top",
    );
    assert.equal(byCount.rows[0]?.activeMembers, 2);
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

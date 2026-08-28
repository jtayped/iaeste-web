import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createCampaignRepository,
  type CreateCampaignInput,
} from "./campaigns";

function campaignInput(
  overrides: Partial<CreateCampaignInput> = {},
): CreateCampaignInput {
  return {
    slug: `campaign-${Math.random().toString(36).slice(2)}`,
    label: "Test campaign",
    membershipStartsAt: new Date("2026-09-01T00:00:00Z"),
    membershipEndsAt: new Date("2027-06-30T00:00:00Z"),
    registrationOpensAt: new Date("2026-08-01T00:00:00Z"),
    registrationClosesAt: new Date("2026-09-30T00:00:00Z"),
    ...overrides,
  };
}

describe("campaigns repository", () => {
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

  it("creates a campaign and finds it by slug", async () => {
    const repo = createCampaignRepository(db);
    const created = await repo.create(campaignInput({ slug: "2026-2027" }));

    const found = await repo.getBySlug("2026-2027");
    assert.equal(found?.id, created.id);
    assert.equal(found?.isCurrent, false);
    assert.equal(found?.isRegistrationOpen, false);
  });

  it("rejects a duplicate slug", async () => {
    const repo = createCampaignRepository(db);
    await repo.create(campaignInput({ slug: "dup" }));

    await assert.rejects(() => repo.create(campaignInput({ slug: "dup" })));
  });

  it("rejects an invalid date range", async () => {
    const repo = createCampaignRepository(db);
    await assert.rejects(() =>
      repo.create(
        campaignInput({
          membershipStartsAt: new Date("2027-01-01"),
          membershipEndsAt: new Date("2026-01-01"),
        }),
      ),
    );
  });

  it("lets a new campaign open registration while an earlier campaign stays current", async () => {
    const repo = createCampaignRepository(db);
    const older = await repo.create(campaignInput({ slug: "2025-2026" }));
    const newer = await repo.create(campaignInput({ slug: "2026-2027" }));

    await repo.setCurrent(older.id);
    await repo.setRegistrationOpen(newer.id);

    const current = await repo.getCurrent();
    const openForRegistration = await repo.getOpenForRegistration();

    assert.equal(current?.id, older.id);
    assert.equal(openForRegistration?.id, newer.id);
  });

  it("switchCurrent moves isCurrent atomically from one campaign to another", async () => {
    const repo = createCampaignRepository(db);
    const a = await repo.create(campaignInput({ slug: "a" }));
    const b = await repo.create(campaignInput({ slug: "b" }));

    await repo.switchCurrent(a.id);
    assert.equal((await repo.getById(a.id))?.isCurrent, true);

    await repo.switchCurrent(b.id);
    assert.equal((await repo.getById(a.id))?.isCurrent, false);
    assert.equal((await repo.getById(b.id))?.isCurrent, true);
  });

  it("rejects a second campaign racing to become current at the same time", async () => {
    const repo = createCampaignRepository(db);
    const a = await repo.create(campaignInput({ slug: "race-a" }));
    const b = await repo.create(campaignInput({ slug: "race-b" }));

    const results = await Promise.allSettled([
      repo.setCurrent(a.id),
      repo.setCurrent(b.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    const rejection = rejected[0] as PromiseRejectedResult;
    // drizzle wraps the driver error: the constraint violation's own message
    // (from Postgres) lands on `.cause`, not `.message`.
    const cause = (rejection.reason as { cause?: Error }).cause;
    assert.match(
      String(cause ?? rejection.reason),
      /duplicate key value|unique constraint/i,
    );

    const current = await repo.getCurrent();
    assert.ok(current);
  });

  it("rejects a second campaign racing to open registration at the same time", async () => {
    const repo = createCampaignRepository(db);
    const a = await repo.create(campaignInput({ slug: "race-reg-a" }));
    const b = await repo.create(campaignInput({ slug: "race-reg-b" }));

    const results = await Promise.allSettled([
      repo.setRegistrationOpen(a.id),
      repo.setRegistrationOpen(b.id),
    ]);

    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  });

  describe("listWithCounts", () => {
    it("filters by q and state, paginates, and returns a full total", async () => {
      const repo = createCampaignRepository(db);
      await repo.create(
        campaignInput({ slug: "2025-2026", label: "Curs 2025-2026" }),
      );
      const published = await repo.create(
        campaignInput({
          slug: "2026-2027",
          label: "Curs 2026-2027",
          state: "published",
        }),
      );
      await repo.create(campaignInput({ slug: "misc-2027", label: "Altre" }));

      // q matches the slug or the label, case-insensitively.
      const byNeedle = await repo.listWithCounts({
        q: "curs",
        limit: 50,
        offset: 0,
      });
      assert.equal(byNeedle.total, 2);
      assert.deepEqual(
        new Set(byNeedle.rows.map((row) => row.slug)),
        new Set(["2025-2026", "2026-2027"]),
      );
      assert.equal(byNeedle.rows[0]?.activeMembers, 0);
      assert.equal(byNeedle.rows[0]?.pendingReview, 0);

      const onlyPublished = await repo.listWithCounts({
        state: "published",
        limit: 50,
        offset: 0,
      });
      assert.equal(onlyPublished.total, 1);
      assert.equal(onlyPublished.rows[0]?.id, published.id);

      // limit/offset slice one page; total stays the unpaginated count.
      const firstPage = await repo.listWithCounts({ limit: 2, offset: 0 });
      assert.equal(firstPage.total, 3);
      assert.equal(firstPage.rows.length, 2);
      const secondPage = await repo.listWithCounts({ limit: 2, offset: 2 });
      assert.equal(secondPage.rows.length, 1);
    });
  });
});

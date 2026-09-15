import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { user } from "../schema/auth";
import { memberProfile } from "../schema/member-profile";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createMemberListQueries } from "./member-list";

describe("member list — ordering", () => {
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

  /** Inserted in one round trip — the tiebreaker case needs a hundred-odd. */
  async function addMembers(
    people: readonly { name: string; surnames: string }[],
  ) {
    const users = people.map((person, index) => ({
      id: crypto.randomUUID(),
      name: `${person.name} ${person.surnames}`,
      email: `member-${index}-${crypto.randomUUID()}@alumnes.udl.cat`,
      emailVerified: true,
    }));
    await db.insert(user).values(users);
    await db.insert(memberProfile).values(
      users.map((row, index) => ({
        userId: row.id,
        name: people[index]!.name,
        surnames: people[index]!.surnames,
        phoneE164: "+34600111222",
        phoneDisplay: "600 111 222",
        degree: "grau en informàtica (lleida)",
        studyYear: 2,
      })),
    );
    return users.map((row) => row.id);
  }

  /**
   * The tiebreaker's reason for existing.
   *
   * Rows whose ordering columns are all equal have no defined order without
   * one, so Postgres's top-N sort is free to pick a different member of the
   * tie for each `OFFSET`. Reproduced on this exact fixture before the fix:
   * a hundred and twenty people paged ten at a time yielded a hundred and
   * twenty rows but only a hundred and sixteen distinct ones — four shown
   * twice, four never shown at all. Three rows is too small to break; the
   * size is the point of the test.
   */
  it("pages through equal-keyed rows without repeating or skipping one", async () => {
    const total = 120;
    const pageSize = 10;
    const created = await addMembers(
      Array.from({ length: total }, () => ({
        name: "Anna",
        surnames: "Garcia",
      })),
    );
    const queries = createMemberListQueries(db);

    const seen: string[] = [];
    for (let offset = 0; offset < total; offset += pageSize) {
      const page = await queries.list({ limit: pageSize, offset });
      seen.push(...page.rows.map((row) => row.userId));
    }

    assert.equal(seen.length, total, "every page came back full");
    assert.equal(
      new Set(seen).size,
      total,
      "every person appeared exactly once across the pages",
    );
    assert.deepEqual([...seen].sort(), [...created].sort());
  });

  it("keeps the same order across two identical queries", async () => {
    await addMembers([
      { name: "Anna", surnames: "Garcia" },
      { name: "Anna", surnames: "Garcia" },
      { name: "Berta", surnames: "Garcia" },
    ]);
    const queries = createMemberListQueries(db);

    const first = await queries.list({ limit: 10, offset: 0 });
    const second = await queries.list({ limit: 10, offset: 0 });
    assert.deepEqual(
      first.rows.map((row) => row.userId),
      second.rows.map((row) => row.userId),
    );
  });
});

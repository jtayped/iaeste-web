import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createTestUser } from "../test-support/fixtures";
import { createPushSubscriptionRepository } from "./push-subscriptions";

describe("push subscription repository", () => {
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

  const sub = (endpoint: string, keys = { p256dh: "k1", auth: "a1" }) => ({
    endpoint,
    keys,
  });

  it("re-subscribing the same endpoint updates in place, does not stack rows", async () => {
    const repo = createPushSubscriptionRepository(db);
    const person = await createTestUser(db);

    await repo.save({ userId: person.id, ...sub("https://push/1") });
    await repo.save({
      userId: person.id,
      ...sub("https://push/1", { p256dh: "k2", auth: "a2" }),
    });

    const rows = await repo.listForUser(person.id);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0]!.keys, { p256dh: "k2", auth: "a2" });
  });

  it("listForAdmins returns only subscriptions whose owner is an admin", async () => {
    const repo = createPushSubscriptionRepository(db);
    const admin = await createTestUser(db, { role: "admin" });
    const member = await createTestUser(db, { role: "member" });

    await repo.save({ userId: admin.id, ...sub("https://push/admin") });
    await repo.save({ userId: member.id, ...sub("https://push/member") });

    const rows = await repo.listForAdmins();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.endpoint, "https://push/admin");
  });

  it("deleteByEndpoint is idempotent", async () => {
    const repo = createPushSubscriptionRepository(db);
    const person = await createTestUser(db);
    await repo.save({ userId: person.id, ...sub("https://push/x") });

    await repo.deleteByEndpoint("https://push/x");
    await repo.deleteByEndpoint("https://push/x");

    assert.equal((await repo.listForUser(person.id)).length, 0);
  });

  it("demoting an admin drops their devices from the admin fan-out", async () => {
    const repo = createPushSubscriptionRepository(db);
    const person = await createTestUser(db, { role: "admin" });
    await repo.save({ userId: person.id, ...sub("https://push/demote") });

    assert.equal((await repo.listForAdmins()).length, 1);

    const { user } = await import("../schema/auth");
    const { eq } = await import("drizzle-orm");
    await db.update(user).set({ role: "member" }).where(eq(user.id, person.id));

    assert.equal((await repo.listForAdmins()).length, 0);
  });
});

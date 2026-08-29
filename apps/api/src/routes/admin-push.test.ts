import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import { createPushSubscriptionRepository } from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import { createTestUser } from "@repo/db/test-support/fixtures";

import { createApp } from "../app";
import {
  createRegistrationServiceStub,
  createStubAuth,
  quietLogger,
} from "../test-support/app";
import type { PushNotifier } from "../lib/web-push";

/**
 * HTTP contract for the admin web-push routes. Authorization depth is covered
 * once in `admin-auth.test.ts`; here the capability wiring and the
 * subscribe/unsubscribe persistence.
 */

const recordingNotifier = (): PushNotifier & { sent: unknown[] } => {
  const sent: unknown[] = [];
  return {
    sent,
    publicKey: "test-vapid-public-key",
    notifyAdmins: async (message) => {
      sent.push(message);
    },
  };
};

function app(
  db: Database,
  opts: {
    role?: "member" | "admin";
    userId?: string;
    notifier?: PushNotifier;
  } = {},
) {
  return createApp({
    db,
    auth: createStubAuth({ role: opts.role ?? "admin", id: opts.userId }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createRegistrationServiceStub(),
    pushNotifier: opts.notifier ?? recordingNotifier(),
  });
}

const body = {
  endpoint: "https://push.example.com/sub/abc",
  keys: { p256dh: "p256dh-key", auth: "auth-secret" },
  userAgent: "Firefox on Android",
};

function post(a: ReturnType<typeof app>, path: string, payload?: unknown) {
  return a.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

describe("admin push routes", () => {
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

  it("a member (not admin) is 403 on subscribe", async () => {
    const res = await post(
      app(db, { role: "member" }),
      "/v1/admin/push/subscribe",
      body,
    );
    assert.equal(res.status, 403);
  });

  it("public-key returns the notifier's VAPID key", async () => {
    const res = await app(db).request("/v1/admin/push/public-key");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { publicKey: "test-vapid-public-key" });
  });

  it("subscribe stores the subscription for the session user, idempotently", async () => {
    const person = await createTestUser(db, { role: "admin" });
    const a = app(db, { userId: person.id });

    assert.equal((await post(a, "/v1/admin/push/subscribe", body)).status, 200);
    assert.equal((await post(a, "/v1/admin/push/subscribe", body)).status, 200);

    const rows = await createPushSubscriptionRepository(db).listForUser(
      person.id,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.endpoint, body.endpoint);
  });

  it("unsubscribe removes it and is idempotent", async () => {
    const person = await createTestUser(db, { role: "admin" });
    const a = app(db, { userId: person.id });
    await post(a, "/v1/admin/push/subscribe", body);

    assert.equal(
      (await post(a, "/v1/admin/push/unsubscribe", { endpoint: body.endpoint }))
        .status,
      200,
    );
    assert.equal(
      (await post(a, "/v1/admin/push/unsubscribe", { endpoint: body.endpoint }))
        .status,
      200,
    );
    assert.equal(
      (await createPushSubscriptionRepository(db).listForUser(person.id))
        .length,
      0,
    );
  });

  it("subscribe rejects a non-URL endpoint", async () => {
    const res = await post(app(db), "/v1/admin/push/subscribe", {
      ...body,
      endpoint: "not-a-url",
    });
    assert.equal(res.status, 422);
  });
});

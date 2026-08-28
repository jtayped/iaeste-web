import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";
import { Children, isValidElement, type ReactNode } from "react";

import { createAuth, revokeAllUserSessions } from "@repo/auth";
import type { Database } from "@repo/db/client";
import { eq } from "drizzle-orm";

import { memberProfile, user } from "@repo/db/schema";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import type { Emailer } from "@repo/email/resend";

import { createApp } from "../app";
import {
  createRegistrationServiceStub,
  quietLogger,
} from "../test-support/app";

/**
 * IA-31 authorization contract for `/v1/admin/*`, exercised against a real
 * Better Auth + Postgres: signed out, wrong role, right role, and a revoked
 * session. The role→capability logic itself is unit-tested in
 * `@repo/auth`'s `permissions.test.ts`; this proves the wiring.
 */

const ADMIN_ORIGIN = "https://admin.iaestelleida.cat";
const AUTH_SECRET = "test-secret-with-at-least-thirty-two-characters";
const LIST_URL = "/v1/admin/registrations?campaignId=campaign_absent";

function findHref(node: ReactNode): string | undefined {
  if (!isValidElement<{ href?: unknown; children?: ReactNode }>(node)) {
    return undefined;
  }
  if (typeof node.props.href === "string") return node.props.href;
  for (const child of Children.toArray(node.props.children)) {
    const href = findHref(child);
    if (href) return href;
  }
  return undefined;
}

function harness(db: Database) {
  let magicLink: string | undefined;
  const emailer: Emailer = {
    async send(message) {
      magicLink = findHref(message.react);
    },
  };
  const auth = createAuth({
    db,
    emailer,
    baseURL: ADMIN_ORIGIN,
    secret: AUTH_SECRET,
    trustedOrigins: [ADMIN_ORIGIN],
    runtime: "test",
  });
  const app = createApp({
    auth,
    logger: quietLogger,
    // The real default calls getDb() (DATABASE_URL); point the profile gate
    // at the same test database Better Auth and the seed helpers use.
    hasMemberProfile: async (userId) => {
      const rows = await db
        .select({ userId: memberProfile.userId })
        .from(memberProfile)
        .where(eq(memberProfile.userId, userId))
        .limit(1);
      return rows.length > 0;
    },
    registrationService: createRegistrationServiceStub({
      list: async () => ({ rows: [], total: 0, limit: 50, offset: 0 }),
    }),
  });
  return {
    app,
    auth,
    getMagicLink() {
      assert.ok(magicLink, "a magic-link email should have been recorded");
      return magicLink;
    },
  };
}

async function signIn(
  app: ReturnType<typeof createApp>,
  getMagicLink: () => string,
  email: string,
) {
  const requested = await app.request("/api/auth/sign-in/magic-link", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ADMIN_ORIGIN },
    body: JSON.stringify({ email }),
  });
  assert.equal(requested.status, 200);
  const verified = await app.request(getMagicLink());
  assert.equal(verified.status, 302);
  const setCookie = verified.headers.get("set-cookie");
  assert.ok(setCookie, "sign-in must set a session cookie");
  const semi = setCookie.indexOf(";");
  return semi === -1 ? setCookie : setCookie.slice(0, semi);
}

async function seedUser(
  db: Database,
  email: string,
  role: "member" | "admin",
  withProfile: boolean,
) {
  const id = crypto.randomUUID();
  await db
    .insert(user)
    .values({ id, name: "Test Person", email, emailVerified: true, role });
  if (withProfile) {
    await db.insert(memberProfile).values({
      userId: id,
      name: "Test",
      surnames: "Person",
      phoneE164: "+34600000000",
      phoneDisplay: "600 000 000",
      degree: "Grau en Informàtica (Lleida)",
      studyYear: 2,
    });
  }
  return id;
}

describe("admin route authorization", () => {
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

  it("401s a request with no session cookie", async () => {
    const { app } = harness(db);
    const response = await app.request(LIST_URL);
    assert.equal(response.status, 401);
  });

  it("403s a signed-in member", async () => {
    const { app, getMagicLink } = harness(db);
    const email = "member@alumnes.udl.cat";
    await seedUser(db, email, "member", true);
    const cookie = await signIn(app, getMagicLink, email);

    const response = await app.request(LIST_URL, { headers: { cookie } });
    assert.equal(response.status, 403);
  });

  it("403s a signed-in admin who has no member_profile row", async () => {
    const { app, getMagicLink } = harness(db);
    const email = "admin-no-profile@alumnes.udl.cat";
    await seedUser(db, email, "admin", false);
    const cookie = await signIn(app, getMagicLink, email);

    const response = await app.request(LIST_URL, { headers: { cookie } });
    assert.equal(response.status, 403);
  });

  it("allows a signed-in, onboarded admin", async () => {
    const { app, getMagicLink } = harness(db);
    const email = "admin@alumnes.udl.cat";
    await seedUser(db, email, "admin", true);
    const cookie = await signIn(app, getMagicLink, email);

    const response = await app.request(LIST_URL, { headers: { cookie } });
    assert.equal(response.status, 200);
  });

  it("401s once the admin's sessions are revoked", async () => {
    const { app, auth, getMagicLink } = harness(db);
    const email = "admin-kicked@alumnes.udl.cat";
    const userId = await seedUser(db, email, "admin", true);
    const cookie = await signIn(app, getMagicLink, email);

    assert.equal(
      (await app.request(LIST_URL, { headers: { cookie } })).status,
      200,
    );

    await revokeAllUserSessions(auth, userId);

    const response = await app.request(LIST_URL, { headers: { cookie } });
    assert.equal(response.status, 401);
  });
});

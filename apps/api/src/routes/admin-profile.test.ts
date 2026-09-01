import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import type { Database } from "@repo/db/client";
import { memberProfile, user, userEmail } from "@repo/db/schema";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import { createTestUser } from "@repo/db/test-support/fixtures";

import { createApp } from "../app";
import {
  createRegistrationServiceStub,
  createStubAuth,
  quietLogger,
} from "../test-support/app";

const VALID_UPDATE = {
  name: "Joana",
  surnames: "Serra Puig",
  phone: "+34 623 32 42 34",
  degree: "grau en informàtica (lleida)",
  year: 4,
};

function makeApp(db: Database, actorId: string, role = "member") {
  return createApp({
    db,
    auth: createStubAuth({ id: actorId, role }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createRegistrationServiceStub(),
  });
}

function patchProfile(app: ReturnType<typeof makeApp>, body: unknown) {
  return app.request("/v1/admin/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function makeMember(db: Database) {
  const account = await createTestUser(db, {
    name: "Before Name",
    role: "member",
  });
  await db.insert(memberProfile).values({
    userId: account.id,
    name: "Before",
    surnames: "Name",
    phoneE164: "+34600111222",
    phoneDisplay: "+34 600 11 12 22",
    degree: "grau en disseny digital",
    studyYear: 2,
  });
  await db.insert(userEmail).values({
    userId: account.id,
    email: account.email,
    kind: "university",
    verifiedAt: new Date(),
  });
  return account;
}

describe("own profile routes", () => {
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

  it("lets a member read only the profile selected by their session", async () => {
    const member = await makeMember(db);
    const response = await makeApp(db, member.id).request("/v1/admin/profile");

    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      profile: { userId: string; name: string };
      emails: { university: { email: string }; personal: null };
    };
    assert.equal(body.profile.userId, member.id);
    assert.equal(body.profile.name, "Before");
    assert.equal(body.emails.university.email, member.email);
    assert.equal(body.emails.personal, null);
  });

  it("updates mutable fields and Better Auth's display name", async () => {
    const member = await makeMember(db);
    const response = await patchProfile(makeApp(db, member.id), VALID_UPDATE);

    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      profile: {
        name: string;
        surnames: string;
        phoneE164: string;
        phoneDisplay: string;
        degree: string;
        studyYear: number;
        role: string;
      };
    };
    assert.deepEqual(
      {
        name: body.profile.name,
        surnames: body.profile.surnames,
        phoneE164: body.profile.phoneE164,
        phoneDisplay: body.profile.phoneDisplay,
        degree: body.profile.degree,
        studyYear: body.profile.studyYear,
        role: body.profile.role,
      },
      {
        name: "Joana",
        surnames: "Serra Puig",
        phoneE164: "+34623324234",
        phoneDisplay: "+34 623 32 42 34",
        degree: "grau en informàtica (lleida)",
        studyYear: 4,
        role: "member",
      },
    );

    const [account] = await db
      .select({ name: user.name, role: user.role, email: user.email })
      .from(user)
      .where(eq(user.id, member.id));
    assert.equal(account?.name, "Joana Serra Puig");
    assert.equal(account?.role, "member");
    assert.equal(account?.email, member.email);
  });

  it("ignores account and role fields supplied in the body", async () => {
    const member = await makeMember(db);
    const response = await patchProfile(makeApp(db, member.id), {
      ...VALID_UPDATE,
      userId: "someone-else",
      role: "admin",
      email: "attacker@example.com",
    });

    assert.equal(response.status, 200);
    const [account] = await db
      .select({ role: user.role, email: user.email })
      .from(user)
      .where(eq(user.id, member.id));
    assert.equal(account?.role, "member");
    assert.equal(account?.email, member.email);
  });

  it("rejects invalid profile data and returns 404 without a profile", async () => {
    const member = await makeMember(db);
    assert.equal(
      (
        await patchProfile(makeApp(db, member.id), {
          ...VALID_UPDATE,
          phone: "not a number",
        })
      ).status,
      422,
    );

    const accountOnly = await createTestUser(db, { role: "member" });
    assert.equal(
      (await makeApp(db, accountOnly.id).request("/v1/admin/profile")).status,
      404,
    );
  });
});

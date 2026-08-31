import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import {
  createCampaignRepository,
  createMembershipRepository,
} from "@repo/db/repositories";
import { and, eq } from "drizzle-orm";

import {
  emailChallenge,
  memberInvitation,
  memberProfile,
  membership,
  membershipEvent,
  registration,
  registrationVerification,
  session,
  user,
} from "@repo/db/schema";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import {
  createTestCampaign,
  createTestUser,
} from "@repo/db/test-support/fixtures";

import { createApp } from "../app";
import {
  createRegistrationServiceStub,
  createStubAuth,
  quietLogger,
} from "../test-support/app";

function makeApp(
  db: Database,
  opts: { role?: "member" | "admin"; actorId?: string } = {},
) {
  return createApp({
    db,
    auth: createStubAuth({
      role: opts.role ?? "admin",
      id: opts.actorId ?? "actor_admin",
    }),
    hasMemberProfile: async () => true,
    logger: quietLogger,
    registrationService: createRegistrationServiceStub(),
  });
}

async function makeMember(db: Database, campaignId: string, overrides = {}) {
  const u = await createTestUser(db, overrides);
  await db.insert(memberProfile).values({
    userId: u.id,
    name: "Nom",
    surnames: "Cognoms",
    phoneE164: "+34600111222",
    phoneDisplay: "600 111 222",
    degree: "grau en informàtica (lleida)",
    studyYear: 3,
  });
  await createMembershipRepository(db).join({
    userId: u.id,
    campaignId,
    source: "registration",
  });
  return u;
}

function post(a: ReturnType<typeof makeApp>, path: string, body?: unknown) {
  return a.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

function del(a: ReturnType<typeof makeApp>, path: string) {
  return a.request(path, { method: "DELETE" });
}

describe("admin members routes", () => {
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

  it("403s a member on the list and on actions", async () => {
    const a = makeApp(db, { role: "member" });
    assert.equal((await a.request("/v1/admin/members")).status, 403);
    assert.equal(
      (await post(a, "/v1/admin/members/x/kick", { reason: "y" })).status,
      403,
    );
    assert.equal((await del(a, "/v1/admin/members/x")).status, 403);
  });

  it("lists members with search and pagination", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setCurrent(campaign.id);
    await makeMember(db, campaign.id, {
      email: "aina@alumnes.udl.cat",
      name: "Aina",
    });
    await makeMember(db, campaign.id, {
      email: "bru@alumnes.udl.cat",
      name: "Bru",
    });

    const all = await makeApp(db).request("/v1/admin/members?limit=1&offset=0");
    assert.equal(all.status, 200);
    const page = (await all.json()) as {
      rows: unknown[];
      total: number;
      limit: number;
    };
    assert.equal(page.total, 2);
    assert.equal(page.rows.length, 1);
    assert.equal(page.limit, 1);

    const search = await makeApp(db).request("/v1/admin/members?q=aina");
    const found = (await search.json()) as { rows: Array<{ email: string }> };
    assert.equal(found.rows.length, 1);
    assert.equal(found.rows[0]?.email, "aina@alumnes.udl.cat");
  });

  it("returns a member detail with memberships and events", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setCurrent(campaign.id);
    const u = await makeMember(db, campaign.id);

    const res = await makeApp(db).request(`/v1/admin/members/${u.id}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      profile: { userId: string };
      memberships: unknown[];
      events: Array<{ eventType: string }>;
    };
    assert.equal(body.profile.userId, u.id);
    assert.equal(body.memberships.length, 1);
    assert.ok(body.events.some((e) => e.eventType === "joined"));
  });

  it("404s member detail for an unknown user", async () => {
    assert.equal(
      (await makeApp(db).request("/v1/admin/members/nope")).status,
      404,
    );
  });

  it("kicks a member (reason required), records the event, and 409s a second kick", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setCurrent(campaign.id);
    const actor = await createTestUser(db);
    const u = await makeMember(db, campaign.id);
    const a = makeApp(db, { actorId: actor.id });

    assert.equal(
      (await post(a, `/v1/admin/members/${u.id}/kick`, {})).status,
      422,
    );

    const kicked = await post(a, `/v1/admin/members/${u.id}/kick`, {
      reason: "codi de conducta",
    });
    assert.equal(kicked.status, 200);
    assert.deepEqual(await kicked.json(), { status: "kicked" });

    const detail = await a.request(`/v1/admin/members/${u.id}`);
    const body = (await detail.json()) as {
      memberships: Array<{ status: string }>;
      events: Array<{ eventType: string }>;
    };
    assert.equal(body.memberships[0]?.status, "kicked");
    assert.ok(body.events.some((e) => e.eventType === "kicked"));

    const again = await post(a, `/v1/admin/members/${u.id}/kick`, {
      reason: "x",
    });
    assert.equal(again.status, 409);
  });

  it("leaves then restores a membership", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setCurrent(campaign.id);
    const actor = await createTestUser(db);
    const u = await makeMember(db, campaign.id);
    const a = makeApp(db, { actorId: actor.id });

    assert.equal(
      (await post(a, `/v1/admin/members/${u.id}/leave`, {})).status,
      200,
    );
    assert.equal(
      (await post(a, `/v1/admin/members/${u.id}/restore`)).status,
      200,
    );
    const detail = (await (
      await a.request(`/v1/admin/members/${u.id}`)
    ).json()) as { memberships: Array<{ status: string }> };
    assert.equal(detail.memberships[0]?.status, "active");
  });

  it("404s an action when the member has no current-campaign membership", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setCurrent(campaign.id);
    const u = await createTestUser(db);
    await db.insert(memberProfile).values({
      userId: u.id,
      name: "X",
      surnames: "Y",
      phoneE164: "+34600000000",
      phoneDisplay: "600",
      degree: "grau en informàtica (lleida)",
      studyYear: 1,
    });
    assert.equal(
      (await post(makeApp(db), `/v1/admin/members/${u.id}/leave`, {})).status,
      404,
    );
  });

  it("changes a member's role and writes a role_changed event", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setCurrent(campaign.id);
    const actor = await createTestUser(db);
    const u = await makeMember(db, campaign.id);
    const a = makeApp(db, { actorId: actor.id });

    const res = await a.request(`/v1/admin/members/${u.id}/role`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { role: "admin" });

    const detail = (await (
      await a.request(`/v1/admin/members/${u.id}`)
    ).json()) as {
      profile: { role: string };
      events: Array<{ eventType: string }>;
    };
    assert.equal(detail.profile.role, "admin");
    assert.ok(detail.events.some((e) => e.eventType === "role_changed"));
  });

  it("404s an erasure for an unknown user id", async () => {
    assert.equal((await del(makeApp(db), "/v1/admin/members/nope")).status, 404);
  });

  it("erases a user and every row about them, leaving other members intact", async () => {
    const campaign = await createTestCampaign(db);
    await createCampaignRepository(db).setCurrent(campaign.id);

    // A bystander who is deactivated ("donar de baixa") — the flow that must
    // keep working, and whose history must survive the erasure below.
    const bystander = await makeMember(db, campaign.id, {
      email: "bystander@alumnes.udl.cat",
    });
    const bystanderMembership = await createMembershipRepository(
      db,
    ).getForUserAndCampaign(bystander.id, campaign.id);
    await createMembershipRepository(db).kick(bystanderMembership!.id, {
      actorId: bystander.id,
      reason: "prova",
    });

    const victim = await makeMember(db, campaign.id, {
      email: "victim@alumnes.udl.cat",
    });

    // Rows keyed by the victim's email, not a user FK.
    const [reg] = await db
      .insert(registration)
      .values({
        campaignId: campaign.id,
        email: "victim@alumnes.udl.cat",
        profileSnapshot: { name: "V", surnames: "C" },
      })
      .returning();
    await db.insert(registrationVerification).values({
      registrationId: reg!.id,
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    await db.insert(emailChallenge).values({
      email: "victim@alumnes.udl.cat",
      codeHash: "codehash",
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    // A live session and an invitation the victim sent.
    await db.insert(session).values({
      id: "sess_victim",
      token: "tok_victim",
      userId: victim.id,
      expiresAt: new Date(Date.now() + 3_600_000),
      updatedAt: new Date(),
    });
    await db.insert(memberInvitation).values({
      campaignId: campaign.id,
      email: "invitee@alumnes.udl.cat",
      inviterId: victim.id,
      tokenHash: "inv_hash",
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const res = await del(makeApp(db), `/v1/admin/members/${victim.id}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      userId: string;
      deleted: Record<string, number>;
    };
    assert.equal(body.userId, victim.id);
    assert.equal(body.deleted.memberships, 1);
    assert.equal(body.deleted.membershipEvents, 1);
    assert.equal(body.deleted.registrations, 1);
    assert.equal(body.deleted.registrationVerifications, 1);
    assert.equal(body.deleted.emailChallenges, 1);
    assert.equal(body.deleted.memberInvitations, 1);
    assert.equal(body.deleted.sessions, 1);
    assert.equal(body.deleted.memberProfile, 1);

    const gone = async (rows: Promise<unknown[]>) =>
      assert.equal((await rows).length, 0);

    await gone(db.select().from(user).where(eq(user.id, victim.id)));
    await gone(
      db
        .select()
        .from(memberProfile)
        .where(eq(memberProfile.userId, victim.id)),
    );
    await gone(
      db.select().from(membership).where(eq(membership.userId, victim.id)),
    );
    await gone(
      db
        .select()
        .from(membershipEvent)
        .where(eq(membershipEvent.targetUserId, victim.id)),
    );
    await gone(db.select().from(session).where(eq(session.userId, victim.id)));
    await gone(
      db
        .select()
        .from(registration)
        .where(eq(registration.email, "victim@alumnes.udl.cat")),
    );
    await gone(
      db
        .select()
        .from(registrationVerification)
        .where(eq(registrationVerification.registrationId, reg!.id)),
    );
    await gone(
      db
        .select()
        .from(emailChallenge)
        .where(eq(emailChallenge.email, "victim@alumnes.udl.cat")),
    );
    await gone(
      db
        .select()
        .from(memberInvitation)
        .where(eq(memberInvitation.inviterId, victim.id)),
    );

    // 404 afterwards, and the deactivated bystander is untouched.
    assert.equal(
      (await makeApp(db).request(`/v1/admin/members/${victim.id}`)).status,
      404,
    );
    const survivors = await db
      .select()
      .from(user)
      .where(eq(user.id, bystander.id));
    assert.equal(survivors.length, 1);
    const bystanderRows = await db
      .select()
      .from(membership)
      .where(
        and(
          eq(membership.userId, bystander.id),
          eq(membership.status, "kicked"),
        ),
      );
    assert.equal(bystanderRows.length, 1);
    const bystanderEvents = await db
      .select()
      .from(membershipEvent)
      .where(eq(membershipEvent.targetUserId, bystander.id));
    assert.ok(bystanderEvents.some((e) => e.eventType === "kicked"));
  });
});

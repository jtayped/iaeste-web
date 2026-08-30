// Seeds `iaeste_dev` with two past campaigns and one current campaign,
// covering the shapes IA-11's queries need to be exercised by hand: a new
// member, a returning member, someone who left, and someone who was kicked.
// Guarded to `iaeste_dev` only — see `assertAllowedDatabase`.
import { createDb, createPool } from "../src/client";
import {
  assertAllowedDatabase,
  DEV_DATABASE_NAME,
  getDatabaseUrl,
} from "../src/config";
import { createCampaignRepository } from "../src/repositories/campaigns";
import { createMembershipRepository } from "../src/repositories/memberships";
import { firstOrThrow } from "../src/repositories/util";
import { user } from "../src/schema/auth";
import { memberProfile } from "../src/schema/member-profile";

async function createSeedMember(
  db: ReturnType<typeof createDb>,
  input: { name: string; surnames: string; email: string },
) {
  const row = firstOrThrow(
    await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: `${input.name} ${input.surnames}`,
        email: input.email,
        emailVerified: true,
      })
      .returning(),
  );

  await db.insert(memberProfile).values({
    userId: row.id,
    name: input.name,
    surnames: input.surnames,
    phoneE164: "+34600000000",
    phoneDisplay: "600 00 00 00",
    degree: "grau en informàtica (lleida)",
    studyYear: 3,
  });

  return row;
}

async function main() {
  const url = getDatabaseUrl();
  assertAllowedDatabase(url, { exact: DEV_DATABASE_NAME });

  const pool = createPool(url);
  const db = createDb(pool);

  try {
    const campaigns = createCampaignRepository(db);
    const memberships = createMembershipRepository(db);

    const past1 = await campaigns.create({
      slug: "2024-2025",
      label: "Curs 2024-2025",
      membershipStartsAt: new Date("2024-09-01"),
      membershipEndsAt: new Date("2025-06-30"),
      registrationOpensAt: new Date("2024-08-01"),
      registrationClosesAt: new Date("2024-09-30"),
      state: "archived",
    });

    const past2 = await campaigns.create({
      slug: "2025-2026",
      label: "Curs 2025-2026",
      membershipStartsAt: new Date("2025-09-01"),
      membershipEndsAt: new Date("2026-06-30"),
      registrationOpensAt: new Date("2025-08-01"),
      registrationClosesAt: new Date("2025-09-30"),
      state: "archived",
    });

    const current = await campaigns.create({
      slug: "2026-2027",
      label: "Curs 2026-2027",
      membershipStartsAt: new Date("2026-09-01"),
      membershipEndsAt: new Date("2027-06-30"),
      registrationOpensAt: new Date("2026-08-01"),
      registrationClosesAt: new Date("2026-09-30"),
      state: "published",
    });
    await campaigns.switchCurrent(current.id);

    const newMember = await createSeedMember(db, {
      name: "Nova",
      surnames: "Membre Exemple",
      email: "nova.membre@alumnes.udl.cat",
    });
    await memberships.join({
      userId: newMember.id,
      campaignId: current.id,
      source: "registration",
    });

    const returningMember = await createSeedMember(db, {
      name: "Retorna",
      surnames: "Membre Exemple",
      email: "retorna.membre@alumnes.udl.cat",
    });
    await memberships.join({
      userId: returningMember.id,
      campaignId: past2.id,
      source: "registration",
    });
    await memberships.join({
      userId: returningMember.id,
      campaignId: current.id,
      source: "registration",
    });

    const leftMember = await createSeedMember(db, {
      name: "Marxa",
      surnames: "Membre Exemple",
      email: "marxa.membre@alumnes.udl.cat",
    });
    const leftMembership = await memberships.join({
      userId: leftMember.id,
      campaignId: past1.id,
      source: "registration",
    });
    await memberships.leave(leftMembership.id, {
      reason: "Va acabar els estudis",
    });

    const kickedMember = await createSeedMember(db, {
      name: "Fora",
      surnames: "Membre Exemple",
      email: "fora.membre@alumnes.udl.cat",
    });
    const kickedMembership = await memberships.join({
      userId: kickedMember.id,
      campaignId: past2.id,
      source: "registration",
    });
    await memberships.kick(kickedMembership.id, {
      reason: "No va assistir a cap esdeveniment",
    });

    console.log("Seeded iaeste_dev:");
    console.log(
      `  campaigns: ${past1.slug}, ${past2.slug}, ${current.slug} (current)`,
    );
    console.log("  members: new, returning, left, kicked");
  } finally {
    await pool.end();
  }
}

await main();

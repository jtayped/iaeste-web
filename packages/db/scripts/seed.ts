// Seeds `iaeste_dev` with registration scenarios that can be exercised from
// the public form. Guarded to that exact database by `assertAllowedDatabase`.
import { isUniversityEmail } from "@repo/constants/validators/member-email";

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
import { registration } from "../src/schema/registration";
import { userEmail } from "../src/schema/user-email";

type Db = ReturnType<typeof createDb>;

interface SeedMemberInput {
  name: string;
  surnames: string;
  universityEmail?: string;
  personalEmail?: string;
  phone?: string;
}

const profileSnapshot = {
  name: "Persona",
  surnames: "Escenari",
  phoneE164: "+34600000000",
  phoneDisplay: "+34 600 00 00 00",
  degree: "grau en informàtica (lleida)",
  studyYear: 3,
  note: "Dades creades per npm run db:seed",
};

async function createSeedMember(db: Db, input: SeedMemberInput) {
  const canonicalEmail = input.personalEmail ?? input.universityEmail;
  if (!canonicalEmail)
    throw new Error("A seed member needs at least one email");

  const row = firstOrThrow(
    await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: `${input.name} ${input.surnames}`,
        email: canonicalEmail,
        emailVerified: true,
      })
      .returning(),
  );

  await db.insert(memberProfile).values({
    userId: row.id,
    name: input.name,
    surnames: input.surnames,
    phoneE164: input.phone ?? "+34600000000",
    phoneDisplay: input.phone ? "+34 611 11 11 11" : "+34 600 00 00 00",
    degree: "grau en informàtica (lleida)",
    studyYear: 3,
  });

  const now = new Date();
  await db.insert(userEmail).values(
    [
      input.universityEmail
        ? {
            userId: row.id,
            kind: "university" as const,
            email: input.universityEmail,
            verifiedAt: now,
          }
        : undefined,
      input.personalEmail
        ? {
            userId: row.id,
            kind: "personal" as const,
            email: input.personalEmail,
            verifiedAt: now,
          }
        : undefined,
    ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
  );

  return row;
}

async function createCurrentRegistration(
  db: Db,
  campaignId: string,
  email: string,
  status: "pending_review" | "accepted" | "rejected",
) {
  const university = isUniversityEmail(email);
  await db.insert(registration).values({
    campaignId,
    email,
    universityEmail: university ? email : null,
    personalEmail: university ? null : email,
    profileSnapshot: {
      ...profileSnapshot,
      name:
        status === "pending_review"
          ? "Pendent"
          : status === "accepted"
            ? "Acceptada"
            : "Rebutjada",
    },
    status,
    verifiedAt: new Date(),
    reviewedAt: status === "pending_review" ? null : new Date(),
    rejectionReason:
      status === "rejected" ? "Escenari de desenvolupament" : null,
  });
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
    await campaigns.switchRegistrationOpen(current.id);

    const returningSame = await createSeedMember(db, {
      name: "Retorna",
      surnames: "Mateix Correu",
      universityEmail: "returning.same@alumnes.udl.cat",
    });
    await memberships.join({
      userId: returningSame.id,
      campaignId: past2.id,
      source: "seed",
    });

    const returningAlias = await createSeedMember(db, {
      name: "Retorna",
      surnames: "Correu Alternatiu",
      universityEmail: "returning.alias@alumnes.udl.cat",
      personalEmail: "returning.alias@example.com",
    });
    await memberships.join({
      userId: returningAlias.id,
      campaignId: past2.id,
      source: "seed",
    });

    const forgotten = await createSeedMember(db, {
      name: "Recorda",
      surnames: "Correu Antic",
      universityEmail: "forgotten.old@alumnes.udl.cat",
    });
    await memberships.join({
      userId: forgotten.id,
      campaignId: past2.id,
      source: "seed",
    });

    const older = await createSeedMember(db, {
      name: "Històric",
      surnames: "No Consecutiu",
      universityEmail: "older.member@alumnes.udl.cat",
    });
    await memberships.join({
      userId: older.id,
      campaignId: past1.id,
      source: "seed",
    });

    const left = await createSeedMember(db, {
      name: "Baixa",
      surnames: "Voluntària",
      personalEmail: "left.lastyear@example.com",
    });
    const leftMembership = await memberships.join({
      userId: left.id,
      campaignId: past2.id,
      source: "seed",
    });
    await memberships.leave(leftMembership.id, {
      reason: "Escenari de desenvolupament",
    });

    const kicked = await createSeedMember(db, {
      name: "Baixa",
      surnames: "Del Comitè",
      universityEmail: "kicked.lastyear@alumnes.udl.cat",
    });
    const kickedMembership = await memberships.join({
      userId: kicked.id,
      campaignId: past2.id,
      source: "seed",
    });
    await memberships.kick(kickedMembership.id, {
      reason: "Escenari de desenvolupament",
    });

    const accepted = await createSeedMember(db, {
      name: "Ja",
      surnames: "Acceptada",
      universityEmail: "accepted.current@alumnes.udl.cat",
    });
    await memberships.join({
      userId: accepted.id,
      campaignId: current.id,
      source: "seed",
    });

    await createCurrentRegistration(
      db,
      current.id,
      "pending.current@example.com",
      "pending_review",
    );
    await createCurrentRegistration(
      db,
      current.id,
      "accepted.current@alumnes.udl.cat",
      "accepted",
    );
    await createCurrentRegistration(
      db,
      current.id,
      "rejected.current@example.com",
      "rejected",
    );

    const scenarios = [
      ["new university applicant", "new.student@alumnes.udl.cat"],
      ["new personal-email applicant", "new.personal@example.com"],
      [
        "returning, same email, automatic renewal",
        "returning.same@alumnes.udl.cat",
      ],
      ["returning, linked university alias", "returning.alias@alumnes.udl.cat"],
      ["returning, linked personal alias", "returning.alias@example.com"],
      [
        "forgot old email, unrecognized new address",
        "forgotten.new@example.com",
      ],
      [
        "forgot old email, retry finds profile",
        "forgotten.old@alumnes.udl.cat",
      ],
      ["older history, manual review", "older.member@alumnes.udl.cat"],
      ["left last year, manual review", "left.lastyear@example.com"],
      ["kicked last year, manual review", "kicked.lastyear@alumnes.udl.cat"],
      ["already pending this campaign", "pending.current@example.com"],
      ["already accepted this campaign", "accepted.current@alumnes.udl.cat"],
      ["already rejected this campaign", "rejected.current@example.com"],
    ] as const;

    console.log("Seeded iaeste_dev registration scenarios:");
    for (const [label, email] of scenarios) {
      console.log(`  ${email.padEnd(42)} ${label}`);
    }
    console.log("Development registration OTPs appear in the API terminal.");
  } finally {
    await pool.end();
  }
}

await main();

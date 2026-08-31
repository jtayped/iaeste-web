// One-off, re-runnable import of the historically-tracked IAESTE Lleida
// members for curs 2024-2025 and 2025-2026.
//
// Consumes a *normalized* roster JSON (`historical-members.json`, produced
// out-of-band from the two raw Google Sheets exports — see
// `historical-members-data.ts` for its shape) and writes `user`,
// `member_profile`, `membership` and `membership_event` rows directly
// through `@repo/db`. It never calls `@repo/auth` or `apps/api`, so no
// magic-link / verification / notification email is ever sent — pure data.
//
// Unlike `db:seed` / `db:reset` / `db:campaign` this is meant to run once
// against production, so it is not pinned to `iaeste_dev`. Instead: dry run
// unless `--commit`; always prints the target database; writing to a db
// that is not `iaeste_dev` / `iaeste_test` also needs `--prod`; and it is
// idempotent (existing users by email, existing memberships by
// user+campaign are skipped) so a re-run after a partial failure is safe.
//
// Usage (from packages/db):
//   npm run db:import-members                       # dry run, local db
//   npm run db:import-members -- --commit           # write, local db
//   npm run db:import-members -- --input ../../some/historical-members.json
//   DATABASE_URL=postgres://…/iaeste  tsx scripts/import-historical-members.ts --commit --prod
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";

import { createDb, createPool, type Database, type Db } from "../src/client";
import { getDatabaseName, getDatabaseUrl } from "../src/config";
import { createCampaignRepository } from "../src/repositories/campaigns";
import { createMembershipRepository } from "../src/repositories/memberships";
import { createMembershipEventRepository } from "../src/repositories/membership-events";
import { firstOrThrow } from "../src/repositories/util";
import { user } from "../src/schema/auth";
import { memberProfile } from "../src/schema/member-profile";
import { membership } from "../src/schema/membership";
import {
  CAMPAIGNS,
  campaignRank,
  parseArgs,
  validateRoster,
  type RosterFile,
  type RosterPerson,
} from "./historical-members-data";

interface Tally {
  usersCreated: number;
  usersSkipped: number;
  admins: number;
  membershipsCreated: number;
  membershipsSkipped: number;
  membershipsLeft: number;
}

async function ensureCampaigns(db: Db, commit: boolean) {
  const campaigns = createCampaignRepository(db as Database);
  const idBySlug = new Map<string, string>();
  for (const spec of CAMPAIGNS) {
    const existing = await campaigns.getBySlug(spec.slug);
    if (existing) {
      idBySlug.set(spec.slug, existing.id);
      console.log(
        `  ${spec.slug}: reuse existing (state ${existing.state}, isCurrent ${existing.isCurrent}) — dates untouched`,
      );
    } else if (!commit) {
      idBySlug.set(spec.slug, `(new:${spec.slug})`);
      console.log(`  ${spec.slug}: WOULD CREATE "${spec.label}" (archived)`);
    } else {
      const created = await campaigns.create(spec);
      idBySlug.set(spec.slug, created.id);
      console.log(`  ${spec.slug}: CREATED "${spec.label}"`);
    }
  }
  return idBySlug;
}

async function importPerson(
  db: Db,
  person: RosterPerson,
  campaignIdBySlug: Map<string, string>,
  commit: boolean,
  tally: Tally,
) {
  const memberships = createMembershipRepository(db);
  const events = createMembershipEventRepository(db);
  const email = person.email.trim().toLowerCase();
  const label = `${person.surnames}, ${person.name} <${email}>`;
  const admin = person.role === "admin";

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));

  let userId: string;
  if (existing) {
    userId = existing.id;
    tally.usersSkipped++;
    console.log(`  ${label}: user exists — not modified`);
  } else if (!commit) {
    userId = `(new:${email})`;
    tally.usersCreated++;
    if (admin) tally.admins++;
    console.log(
      `  ${label}: WOULD CREATE user + profile${admin ? " + role=admin" : ""} (${person.degree}, any ${person.studyYear})`,
    );
  } else {
    const created = firstOrThrow(
      await db
        .insert(user)
        .values({
          id: crypto.randomUUID(),
          name: `${person.name} ${person.surnames}`.trim(),
          email,
          emailVerified: true,
          role: person.role,
        })
        .returning({ id: user.id }),
    );
    userId = created.id;
    tally.usersCreated++;
    if (admin) tally.admins++;
    await db.insert(memberProfile).values({
      userId,
      name: person.name.trim(),
      surnames: person.surnames.trim(),
      phoneE164: person.phoneE164.trim(),
      phoneDisplay: person.phoneDisplay.trim(),
      degree: person.degree,
      studyYear: person.studyYear,
    });
    console.log(
      `  ${label}: created user + profile${admin ? " + role=admin" : ""}`,
    );
  }

  // Oldest campaign first, so `memberships.join()` sees the earlier row and
  // classifies the second as "renewed".
  const ordered = [...person.memberships].sort(
    (a, b) => campaignRank(a.campaignSlug) - campaignRank(b.campaignSlug),
  );

  for (const m of ordered) {
    const campaignId = campaignIdBySlug.get(m.campaignSlug);
    if (!campaignId) throw new Error(`No campaign id for ${m.campaignSlug}`);
    const spec = CAMPAIGNS[campaignRank(m.campaignSlug)]!;

    if (!userId.startsWith("(new:")) {
      const found = await memberships.getForUserAndCampaign(userId, campaignId);
      if (found) {
        tally.membershipsSkipped++;
        console.log(`      ${m.campaignSlug}: membership exists — skipped`);
        continue;
      }
    }

    tally.membershipsCreated++;
    if (m.status === "left") tally.membershipsLeft++;

    if (!commit) {
      console.log(
        `      ${m.campaignSlug}: WOULD JOIN (source admin)${m.status === "left" ? " then mark LEFT" : ""}`,
      );
      continue;
    }

    const row = await memberships.join({
      userId,
      campaignId,
      source: "admin",
      actorId: null,
    });

    if (m.status === "left") {
      // Backdate the end to the campaign's end rather than "now" (which the
      // repo's `leave()` would stamp), with a matching audit event.
      await db
        .update(membership)
        .set({
          status: "left",
          endedAt: spec.membershipEndsAt,
          endedReason: "Importat com a exmembre del full de curs 2025-2026",
        })
        .where(eq(membership.id, row.id));
      await events.record({
        eventType: "left",
        targetUserId: userId,
        campaignId,
        actorId: null,
        details: { reason: "historical import: exmembre" },
      });
      console.log(`      ${m.campaignSlug}: joined then marked LEFT`);
    } else {
      console.log(`      ${m.campaignSlug}: joined`);
    }
  }
}

async function run(
  db: Db,
  people: RosterPerson[],
  commit: boolean,
  tally: Tally,
) {
  console.log("Campaigns:");
  const ids = await ensureCampaigns(db, commit);
  console.log("\nPeople:");
  for (const person of people) {
    await importPerson(db, person, ids, commit, tally);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = getDatabaseUrl();
  const dbName = getDatabaseName(url);
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return "?";
    }
  })();
  const isLocalDb = dbName === "iaeste_dev" || dbName.startsWith("iaeste_test");

  console.log("─".repeat(70));
  console.log(`Target database : ${dbName}  (host ${host})`);
  console.log(
    `Mode           : ${args.commit ? "COMMIT (writes)" : "dry run"}`,
  );
  console.log("─".repeat(70));

  if (args.commit && !isLocalDb && !args.prod) {
    console.error(
      `\nRefusing to write to "${dbName}": not iaeste_dev/iaeste_test and --prod not passed.`,
    );
    process.exit(1);
  }

  const inputPath = resolve(
    process.cwd(),
    args.input || "./historical-members.json",
  );
  console.log(`Roster file    : ${inputPath}\n`);

  let roster: RosterFile;
  try {
    roster = JSON.parse(readFileSync(inputPath, "utf8")) as RosterFile;
  } catch (error) {
    console.error(`Could not read/parse the roster file: ${String(error)}`);
    process.exit(1);
  }

  const people = roster.people ?? [];
  if (people.length === 0) {
    console.error("Roster has no people. Aborting.");
    process.exit(1);
  }

  const problems = validateRoster(people);
  if (problems.length > 0) {
    console.error(`Roster failed validation (${problems.length}):`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error("\nNothing was written.");
    process.exit(1);
  }
  const flagged = people.filter((p) => p.flags && p.flags.length > 0).length;
  console.log(
    `Roster OK: ${people.length} people validated against DB constraints` +
      (flagged
        ? `; ${flagged} carry review flags (see the roster report).`
        : "."),
  );

  const pool = createPool(url);
  const db = createDb(pool);
  const tally: Tally = {
    usersCreated: 0,
    usersSkipped: 0,
    admins: 0,
    membershipsCreated: 0,
    membershipsSkipped: 0,
    membershipsLeft: 0,
  };

  try {
    if (args.commit) {
      await db.transaction((tx) => run(tx, people, true, tally));
    } else {
      await run(db, people, false, tally);
    }

    console.log("\n" + "─".repeat(70));
    console.log(
      args.commit ? "Committed." : "Dry run complete. Nothing written.",
    );
    console.log(
      `  users       : ${tally.usersCreated} created, ${tally.usersSkipped} already existed`,
    );
    console.log(`  role=admin  : ${tally.admins}`);
    console.log(
      `  memberships : ${tally.membershipsCreated} created (${tally.membershipsLeft} left), ${tally.membershipsSkipped} already existed`,
    );
    console.log("─".repeat(70));
  } finally {
    await pool.end();
  }
}

await main();

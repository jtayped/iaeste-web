// Dev-only convenience for the "open up next year's inscripcions" workflow
// that today has no admin UI behind it. Guarded to `iaeste_dev` — see
// `assertAllowedDatabase` — this is not how a production campaign rollover
// happens; that still needs the admin app (not built yet) or an authenticated
// admin API route.
//
// Usage (from packages/db):
//   npm run db:campaign -- open <slug> [label]
//   npm run db:campaign -- close <slug>
//   npm run db:campaign -- list
//
// `open` creates the campaign if it doesn't exist yet (deriving Sep 1 - Jun
// 30 membership dates and a one-month registration window from the slug,
// e.g. "2027-2028"), then makes it the current campaign and opens
// registration on it — closing registration and stepping down whichever
// campaign held those flags before, via the repository's own transactional
// switchCurrent/switchRegistrationOpen.
import { createDb, createPool } from "../src/client";
import {
  assertAllowedDatabase,
  DEV_DATABASE_NAME,
  getDatabaseUrl,
} from "../src/config";
import { createCampaignRepository } from "../src/repositories/campaigns";

function deriveDatesFromSlug(slug: string) {
  const match = slug.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    throw new Error(
      `Can't derive dates from slug "${slug}" — expected the "YYYY-YYYY" shape (e.g. "2027-2028"), or create the campaign by hand if this one doesn't fit that pattern.`,
    );
  }
  const [, startYear, endYear] = match;
  return {
    membershipStartsAt: new Date(`${startYear}-09-01`),
    membershipEndsAt: new Date(`${endYear}-06-30`),
    registrationOpensAt: new Date(),
    registrationClosesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

async function main() {
  const [command, slug, label] = process.argv.slice(2);
  if (!command) {
    console.error("Usage: db:campaign -- <open|close|list> [slug] [label]");
    process.exit(1);
  }

  const url = getDatabaseUrl();
  assertAllowedDatabase(url, { exact: DEV_DATABASE_NAME });
  const pool = createPool(url);
  const db = createDb(pool);

  try {
    const campaigns = createCampaignRepository(db);

    if (command === "list") {
      const all = await campaigns.list();
      for (const c of all) {
        console.log(
          `${c.slug}  ${c.label}  current=${c.isCurrent}  registrationOpen=${c.isRegistrationOpen}  state=${c.state}`,
        );
      }
      return;
    }

    if (!slug) {
      console.error(`Usage: db:campaign -- ${command} <slug> [label]`);
      process.exit(1);
    }

    if (command === "open") {
      let campaign = await campaigns.getBySlug(slug);
      if (!campaign) {
        campaign = await campaigns.create({
          slug,
          label: label ?? `Curs ${slug}`,
          state: "published",
          ...deriveDatesFromSlug(slug),
        });
        console.log(`Created campaign ${slug}.`);
      }
      await campaigns.switchCurrent(campaign.id);
      await campaigns.switchRegistrationOpen(campaign.id);
      console.log(`${slug} is now the current campaign, registration open.`);
      return;
    }

    if (command === "close") {
      const campaign = await campaigns.getBySlug(slug);
      if (!campaign) throw new Error(`No campaign with slug "${slug}"`);
      await campaigns.unsetRegistrationOpen(campaign.id);
      console.log(`Registration closed for ${slug}.`);
      return;
    }

    console.error(`Unknown command "${command}". Use open, close, or list.`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

await main();

// Roster contract + validation for `import-historical-members.ts`. Kept in
// its own module so the importer stays focused on the database writes.
//
// Membership window runs Sep 1 -> Sep 1, per the roster owner. Both
// campaigns are `archived` and neither is `isCurrent` /
// `isRegistrationOpen`, so they are invisible to the public site and only
// appear in the admin members / campaigns lists.
export const CAMPAIGNS = [
  {
    slug: "2024-2025",
    label: "Curs 2024-2025",
    membershipStartsAt: new Date("2024-09-01T00:00:00.000Z"),
    membershipEndsAt: new Date("2025-09-01T00:00:00.000Z"),
    registrationOpensAt: new Date("2024-08-01T00:00:00.000Z"),
    registrationClosesAt: new Date("2024-10-31T00:00:00.000Z"),
    state: "archived" as const,
  },
  {
    slug: "2025-2026",
    label: "Curs 2025-2026",
    membershipStartsAt: new Date("2025-09-01T00:00:00.000Z"),
    membershipEndsAt: new Date("2026-09-01T00:00:00.000Z"),
    registrationOpensAt: new Date("2025-08-01T00:00:00.000Z"),
    registrationClosesAt: new Date("2025-10-31T00:00:00.000Z"),
    state: "archived" as const,
  },
];
export type CampaignSlug = (typeof CAMPAIGNS)[number]["slug"];

export const campaignRank = (slug: string) =>
  CAMPAIGNS.findIndex((c) => c.slug === slug);

export interface RosterMembership {
  campaignSlug: CampaignSlug;
  status: "active" | "left";
}
export interface RosterPerson {
  email: string;
  name: string;
  surnames: string;
  phoneE164: string;
  phoneDisplay: string;
  degree: string;
  studyYear: number;
  role: "member" | "admin";
  memberships: RosterMembership[];
  flags?: string[];
}
export interface RosterFile {
  people: RosterPerson[];
}

const DEGREE_OPTIONS = new Set([
  "grau en informàtica (lleida)",
  "grau en informàtica (igualada)",
  "grau en tècniques d'interacció digital",
  "grau en disseny digital",
  "doble grau en informàtica i ADE",
  "grau en enginyeria mecànica",
  "grau en enginyeria química",
  "grau en enginyeria de l'energia",
  "grau en eng. electrònica industrial",
  "grau en organització industrial",
  "doble grau en organització industrial i ADE",
  "doble grau en mecànica i energia",
  "grau en arquitectura tècnica",
  "altre",
]);

export interface Args {
  commit: boolean;
  prod: boolean;
  input: string;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = { commit: false, prod: false, input: "" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--commit") args.commit = true;
    else if (arg === "--prod") args.prod = true;
    else if (arg === "--input") args.input = argv[++i] ?? "";
    else if (arg.startsWith("--input="))
      args.input = arg.slice("--input=".length);
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

/** Every roster row the database's own constraints would reject. */
export function validateRoster(people: RosterPerson[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const p of people) {
    const who = `${p.name} ${p.surnames} <${p.email}>`;
    const bad = (msg: string) => problems.push(`${who}: ${msg}`);
    if (!p.email?.includes("@")) bad("missing/invalid email");
    if (seen.has(p.email)) bad("duplicate email in roster");
    seen.add(p.email);
    if (!p.name?.trim()) bad("empty name");
    if (!p.surnames?.trim()) bad("empty surnames");
    if (!p.phoneE164?.startsWith("+"))
      bad(`phoneE164 not E.164 ("${p.phoneE164}")`);
    if (!p.phoneDisplay?.trim()) bad("empty phoneDisplay");
    if (!DEGREE_OPTIONS.has(p.degree)) bad(`degree "${p.degree}" not allowed`);
    if (!Number.isInteger(p.studyYear) || p.studyYear < 1 || p.studyYear > 6)
      bad(`studyYear ${p.studyYear} outside 1..6`);
    if (p.role !== "member" && p.role !== "admin")
      bad(`role "${p.role}" invalid`);
    if (!p.memberships?.length) bad("no memberships");
    const slugs = new Set<string>();
    for (const m of p.memberships ?? []) {
      if (campaignRank(m.campaignSlug) < 0)
        bad(`unknown campaign "${m.campaignSlug}"`);
      if (slugs.has(m.campaignSlug))
        bad(`two memberships for ${m.campaignSlug}`);
      slugs.add(m.campaignSlug);
      if (m.status !== "active" && m.status !== "left")
        bad(`membership status "${m.status}" invalid`);
    }
  }
  return problems;
}

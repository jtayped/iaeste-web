import type { Database } from "../client";
import { user } from "../schema/auth";
import {
  createCampaignRepository,
  type CreateCampaignInput,
} from "../repositories/campaigns";
import { firstOrThrow } from "../repositories/util";

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createTestCampaign(
  db: Database,
  overrides: Partial<CreateCampaignInput> = {},
) {
  const repo = createCampaignRepository(db);
  return repo.create({
    slug: unique("campaign"),
    label: "Test campaign",
    membershipStartsAt: new Date("2026-09-01T00:00:00Z"),
    membershipEndsAt: new Date("2027-06-30T00:00:00Z"),
    registrationOpensAt: new Date("2026-08-01T00:00:00Z"),
    registrationClosesAt: new Date("2026-09-30T00:00:00Z"),
    ...overrides,
  });
}

export async function createTestUser(
  db: Database,
  overrides: Partial<typeof user.$inferInsert> = {},
) {
  return firstOrThrow(
    await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: "Test User",
        email: `${unique("user")}@alumnes.udl.cat`,
        emailVerified: true,
        ...overrides,
      })
      .returning(),
  );
}

export function testProfileSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    name: "Joana",
    surnames: "Serra Puig",
    phoneE164: "+34623324234",
    phoneDisplay: "623 32 42 34",
    degree: "grau en informàtica (lleida)",
    studyYear: 3,
    previousMember: false,
    note: "",
    ...overrides,
  };
}

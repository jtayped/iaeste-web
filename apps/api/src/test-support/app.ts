import type { Registration } from "@repo/constants/validators/registration";
import type { Auth } from "@repo/auth";
import type { Database } from "@repo/db/client";

import { createApp } from "../app";
import type { PublicRegistrationStatus } from "../contracts";
import type { RegistrationRepository } from "../repositories/registrations";
import type { CrmAnalytics } from "../lib/crm-metrics";
import type { CrmAnalyticsService } from "../services/crm-analytics-service";
import type { RegistrationChallengeService } from "../services/registration-challenge-service";
import type { RegistrationService } from "../services/registration-service";

/** Shared fixtures/helpers for app.test.ts and app.admin.test.ts. */

export const validRegistration: Registration = {
  name: "Joan",
  surnames: "Garcia Serra",
  universityEmail: "joan@alumnes.udl.cat",
  personalEmail: "joan@example.com",
  phone: "+34 623 32 42 34",
  degree: "grau en informàtica (lleida)",
  year: 2,
  note: "Hola",
};

/** The session token the stub challenge service below accepts. */
export const VALID_EMAIL_TOKEN = "email-session-token";

/**
 * What a client actually posts: the profile plus a session token. The address
 * is never in the body — the API reads it off the session — so this is
 * `validRegistration` with `email` traded for `emailToken`.
 */
export const validRegistrationBody = {
  name: validRegistration.name,
  surnames: validRegistration.surnames,
  phone: validRegistration.phone,
  degree: validRegistration.degree,
  year: validRegistration.year,
  note: validRegistration.note,
  emailToken: VALID_EMAIL_TOKEN,
};

export function createChallengeServiceStub(
  overrides: Partial<RegistrationChallengeService> = {},
): RegistrationChallengeService {
  const draftFor = (token: string) =>
    token === VALID_EMAIL_TOKEN
      ? {
          draftId: "draft_123",
          universityEmail: validRegistration.universityEmail,
          personalEmail: validRegistration.personalEmail,
        }
      : undefined;

  return {
    start: async () => ({ resendAfterSeconds: 60 }),
    verifyCode: async () => undefined,
    verifyLink: async () => undefined,
    resume: async () => undefined,
    resendLink: async () => undefined,
    resolveSession: async (token) => draftFor(token),
    consumeSession: async (token) => Boolean(draftFor(token)),
    ...overrides,
  };
}

export function createRepository(
  create: RegistrationRepository["create"] = async () => ({
    id: "registration_123",
    outcome: "pending_review",
  }),
): RegistrationRepository {
  return { create };
}

export function createRegistrationServiceStub(
  overrides: Partial<RegistrationService> = {},
): RegistrationService {
  return {
    list: async () => ({ rows: [], total: 0, limit: 50, offset: 0 }),
    resendVerification: async () => undefined,
    verify: async () => undefined,
    accept: async () => ({ notificationSent: true }),
    acceptMany: async () => ({
      requested: 0,
      accepted: 0,
      skipped: 0,
      failed: [],
      notificationsSent: 0,
      notificationsFailed: [],
    }),
    reject: async () => ({ notificationSent: true }),
    restore: async () => undefined,
    detail: async () => undefined,
    ...overrides,
  };
}

/** The window every test that does not care about dates gets handed. */
export const OPEN_REGISTRATION_STATUS: PublicRegistrationStatus = {
  open: true,
  opensAt: "2026-09-15T08:00:00.000Z",
  closesAt: "2026-10-15T22:00:00.000Z",
};

export const quietLogger = { error() {} };

/**
 * A stand-in Better Auth whose `getSession` returns a fixed session — lets
 * the admin route *behaviour* tests (status mapping, notificationSent) run
 * without a real Postgres. The signed-out / member / expired / revoked
 * contract matrix is covered against a real `createAuth` in
 * `routes/admin-auth.test.ts`.
 */
export function createStubAuth(
  user: {
    id?: string;
    role?: string | null;
    email?: string;
    name?: string;
  } | null = {},
): Auth {
  return {
    api: {
      getSession: async () =>
        user === null
          ? null
          : {
              session: { id: "session_stub", userId: user.id ?? "user_admin" },
              user: {
                id: user.id ?? "user_admin",
                role: user.role === undefined ? "admin" : user.role,
                email: user.email ?? "admin@iaestelleida.cat",
                name: user.name ?? "Admin",
              },
            },
    },
  } as unknown as Auth;
}

export function createTestApp(
  registrationRepository = createRepository(),
  registrationService = createRegistrationServiceStub(),
  getRegistrationStatus: () => Promise<PublicRegistrationStatus> = async () =>
    OPEN_REGISTRATION_STATUS,
  auth: Auth = createStubAuth(),
  hasMemberProfile: (userId: string) => Promise<boolean> = async () => true,
  db?: Database,
  registrationChallengeService = createChallengeServiceStub(),
) {
  return createApp({
    getRegistrationStatus,
    registrationRepository,
    registrationService,
    registrationChallengeService,
    logger: quietLogger,
    auth,
    hasMemberProfile,
    db,
  });
}

/** A snapshot with every field present and nothing interesting in it. */
export const emptyCrmAnalytics: CrmAnalytics = {
  activity: {
    daysSinceLastActivity: null,
    lastActivityAt: null,
    touchedLast7Days: 0,
    touchedLast30Days: 0,
  },
  coldLeads: [],
  fetchedAt: "2026-09-12T00:00:00.000Z",
  funnel: [],
  owners: [],
  stages: [],
  stale: false,
  staleBuckets: { from7To29: 0, from30To89: 0, from90: 0, upTo6: 0 },
  totals: {
    activeLeads: 0,
    allLeads: 0,
    archivedLeads: 0,
    droppedLeads: 0,
    openLeads: 0,
    staleLeads: 0,
    unassignedLeads: 0,
    wonLeads: 0,
  },
  truncated: false,
  unclassifiedStages: [],
  won: { count: 0, medianDaysToClose: null, sampleSize: 0 },
};

export function createCrmAnalyticsStub(
  overrides: Partial<CrmAnalyticsService> = {},
): CrmAnalyticsService {
  return {
    snapshot: async () => emptyCrmAnalytics,
    ...overrides,
  };
}

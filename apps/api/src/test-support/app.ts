import type { Registration } from "@repo/constants/validators/registration";
import type { Auth } from "@repo/auth";
import type { Database } from "@repo/db/client";

import { createApp } from "../app";
import type { PublicRegistrationStatus } from "../contracts";
import type { RegistrationRepository } from "../repositories/registrations";
import type { RegistrationService } from "../services/registration-service";

/** Shared fixtures/helpers for app.test.ts and app.admin.test.ts. */

export const validRegistration: Registration = {
  name: "Joan",
  surnames: "Garcia Serra",
  email: "joan@alumnes.udl.cat",
  phone: "+34 623 32 42 34",
  degree: "grau en informàtica (lleida)",
  year: 2,
  note: "Hola",
};

export function createRepository(
  create: RegistrationRepository["create"] = async () => ({
    id: "registration_123",
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
) {
  return createApp({
    getRegistrationStatus,
    registrationRepository,
    registrationService,
    logger: quietLogger,
    auth,
    hasMemberProfile,
    db,
  });
}

import type { Registration } from "@repo/constants/validators/registration";

import { createApp } from "../app";
import type { RegistrationRepository } from "../repositories/registrations";
import type { RegistrationService } from "../services/registration-service";

/** Shared fixtures/helpers for app.test.ts and app.admin.test.ts. */

export const validRegistration: Registration = {
  name: "Joan",
  surnames: "Garcia Serra",
  email: "joan@alumnes.udl.cat",
  phone: "+34 623 32 42 34",
  degree: "Grau en Informàtica (Lleida)",
  year: 2,
  note: "Hola",
};

export function createRepository(
  create: RegistrationRepository["create"] = async () => undefined,
): RegistrationRepository {
  return { create };
}

export function createRegistrationServiceStub(
  overrides: Partial<RegistrationService> = {},
): RegistrationService {
  return {
    list: async () => [],
    resendVerification: async () => undefined,
    verify: async () => undefined,
    accept: async () => ({ notificationSent: true }),
    reject: async () => ({ notificationSent: true }),
    ...overrides,
  };
}

export const quietLogger = { error() {} };

export function createTestApp(
  registrationRepository = createRepository(),
  registrationService = createRegistrationServiceStub(),
) {
  return createApp({
    registrationRepository,
    registrationService,
    logger: quietLogger,
  });
}

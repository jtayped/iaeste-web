import crypto from "node:crypto";

import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

import type { Registration } from "@repo/constants/validators/registration";
import { parsePhone } from "@repo/constants/validators/phone";
import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createRegistrationRepository,
  type RegistrationProfileSnapshot,
} from "@repo/db/repositories";
import RegistrationPending from "@repo/email/pending-review";
import { createResendEmailer, type Emailer } from "@repo/email/resend";

import { getEmailConfig } from "../config";
import { requireEnvironmentVariable } from "../lib/env";
import "../lib/react-global";

export interface RegistrationRepository {
  create(registration: Registration): Promise<{ id: string }>;
}

/**
 * Thrown by `.create()` when no campaign is currently open for
 * registration. A distinct class (rather than a plain `Error`) so
 * `app.ts`'s route handler can map it to a clear, distinguishable
 * `CONFLICT` response instead of the generic 500 every other repository
 * failure gets — the frontend's "registrations are closed" state (IA-41)
 * depends on being able to tell these apart.
 */
export class RegistrationsClosedError extends Error {
  constructor() {
    super("No campaign is currently open for registration.");
    this.name = "RegistrationsClosedError";
  }
}

/**
 * Thrown by `.create()` when this email already has a registration for the
 * open campaign — `@repo/db`'s unique index on (campaignId, email) is what
 * actually enforces this; this class just gives app.ts something specific
 * to catch instead of the generic 500 every other unexpected failure gets.
 * A distinct code from `RegistrationsClosedError`: the frontend (IA-41)
 * needs "you already registered, check your email" and "registration is
 * closed" to read as different pages from the same endpoint.
 */
export class RegistrationAlreadyExistsError extends Error {
  constructor() {
    super("A registration already exists for this email and campaign.");
    this.name = "RegistrationAlreadyExistsError";
  }
}

/** True for a Postgres unique-violation (error code 23505), however Drizzle/pg wrapped it. */
function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } } | undefined)?.cause;
  const code = (error as { code?: string } | undefined)?.code ?? cause?.code;
  return code === "23505";
}

let cachedEmailer: Emailer | undefined;

/**
 * Lazily constructs (and memoises) the Resend-backed emailer used by every
 * registration-related email `apps/api` sends. Lazy for the same reason
 * `getDb()` below is only called inside `.create()`: resolving
 * `RESEND_API_KEY`/`REGISTRATION_EMAIL_FROM` eagerly would make merely
 * importing `app.ts` crash whenever they're unset (module-import time is
 * what `apps/api/scripts/generate-openapi.ts` and every test file trigger).
 */
export function getEmailer(): Emailer {
  if (!cachedEmailer) cachedEmailer = createResendEmailer(getEmailConfig());
  return cachedEmailer;
}

export interface RegistrationRepositoryDependencies {
  /** Overridable so tests never need a real `RESEND_API_KEY`. */
  emailer?: Emailer;
}

/**
 * The default `RegistrationRepository`, backed by `@repo/db` (IA-12) plus
 * the email-verification flow (IA-40): after the row lands in
 * `pending_email`, this generates a random verification token, stores only
 * its hash (see `registration_verification`'s column comment), and emails
 * the applicant a link carrying the raw token. The admin-review transitions
 * live in `services/registration-service.ts`, not here.
 *
 * Critical: `getDb()` (and therefore `getDatabaseUrl()`, which throws
 * synchronously if `DATABASE_URL` is unset) is only ever called from inside
 * `.create()`, never at factory-construction time. `app.ts`'s
 * `createApp()` — and therefore this factory — runs unconditionally at
 * module-import time (see `apps/api/scripts/generate-openapi.ts`), so
 * resolving the database connection here eagerly would make merely
 * importing `app.ts` crash whenever `DATABASE_URL` isn't set. See
 * `app.test.ts`'s laziness test and `repositories/registrations.test.ts`.
 * The lazy `getEmailer()` above exists for the identical reason.
 */
export function createDrizzleRegistrationRepository(
  dependencies: RegistrationRepositoryDependencies = {},
): RegistrationRepository {
  return {
    async create(registration) {
      const db = getDb();
      const campaigns = createCampaignRepository(db);

      const openCampaign = await campaigns.getOpenForRegistration();
      if (!openCampaign) {
        throw new RegistrationsClosedError();
      }

      // `registrationRequestSchema`'s `.refine()` (contracts.ts) already
      // guarantees this parses — this is a defensive safety net, not the
      // primary validation, so a plain thrown Error (surfaced as a generic
      // 500, same as any other unexpected repository failure) is enough.
      const phone = parsePhone(registration.phone);
      if (!phone) {
        throw new Error(
          "Phone number failed to parse after request validation.",
        );
      }

      const profileSnapshot: RegistrationProfileSnapshot = {
        name: registration.name,
        surnames: registration.surnames,
        phoneE164: phone.e164,
        phoneDisplay: phone.display,
        degree: registration.degree,
        studyYear: registration.year,
        // `previousMember` is no longer supplied by the applicant (IA-40):
        // new vs. returning is now derived from membership history in
        // @repo/db, not asked on the form.
        note: registration.note,
      };

      const registrations = createRegistrationRepository(db);
      let created;
      try {
        created = await registrations.create({
          campaignId: openCampaign.id,
          email: registration.email,
          profileSnapshot,
          // The address was proven by the code step before any of this was
          // collected, so there is nothing left to verify. Landing in
          // `pending_email` here would strand the applicant waiting for an
          // email we are never going to send.
          status: "pending_review",
          verifiedAt: new Date(),
        });
      } catch (error) {
        if (isUniqueViolation(error))
          throw new RegistrationAlreadyExistsError();
        throw error;
      }

      // Nothing past this point may roll back or fail the request —
      // `getEmailer()` construction (e.g. a misconfigured RESEND_API_KEY)
      // included. The registration row already exists in `pending_review`,
      // which is the durable, valuable side effect; the applicant is in the
      // committee's queue whether or not this receipt arrives. Returning a
      // 5xx would be strictly worse, because resubmitting the form would
      // then collide with the row that actually did save.
      try {
        const emailer = dependencies.emailer ?? getEmailer();
        await emailer.send({
          to: created.email,
          subject: "sol·licitud rebuda · iaeste lc lleida",
          react: RegistrationPending({
            name: registration.name,
            email: created.email,
            campaign: openCampaign.label,
          }),
        });
      } catch (error) {
        console.error("Failed to send pending-review email", error);
      }

      return { id: created.id };
    },
  };
}

type SheetsConfig = {
  clientEmail: string;
  privateKey: string;
  projectId: string;
  range: string;
  spreadsheetId: string;
};

function getSheetsConfig(): SheetsConfig {
  return {
    clientEmail: requireEnvironmentVariable("SHEETS_CLIENT_EMAIL"),
    privateKey: requireEnvironmentVariable("SHEETS_PRIVATE_KEY").replace(
      /\\n/g,
      "\n",
    ),
    projectId: requireEnvironmentVariable("SHEETS_PROJECT_ID"),
    range: process.env.SHEETS_RANGE?.trim() || "inscripcions!A:H",
    spreadsheetId: requireEnvironmentVariable("SHEETS_SPREADSHEET_ID"),
  };
}

/**
 * No longer wired as the default (see `createDrizzleRegistrationRepository`
 * above, IA-12) — kept defined and exported because IA-54 relocates this
 * googleapis service-account logic into a small campaign export service
 * rather than deleting it.
 */
export function createGoogleSheetsRegistrationRepository(): RegistrationRepository {
  return {
    async create(registration) {
      const config = getSheetsConfig();
      const auth = new GoogleAuth({
        scopes: "https://www.googleapis.com/auth/spreadsheets",
        credentials: {
          client_email: config.clientEmail,
          private_key: config.privateKey,
          project_id: config.projectId,
        },
      });
      const sheets = google.sheets({ version: "v4", auth });

      await sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: config.range,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              registration.name,
              registration.surnames,
              registration.email,
              registration.phone,
              registration.degree,
              registration.year,
              registration.note ?? "",
            ],
          ],
        },
      });

      // A spreadsheet row has no natural id. This function is dormant
      // (IA-12) and never actually invoked as the app's default — kept
      // only so IA-54 can relocate this logic — so a synthetic id here
      // satisfies the interface without meaning anything.
      return { id: crypto.randomUUID() };
    },
  };
}

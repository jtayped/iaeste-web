import crypto from "node:crypto";

import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

import type { Registration } from "@repo/constants/validators/registration";
import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createRegistrationRepository,
  createRegistrationVerificationRepository,
  type RegistrationProfileSnapshot,
} from "@repo/db/repositories";
import { createResendEmailer, type Emailer } from "@repo/email/resend";
import VerifyUserEmail from "@repo/email/verify-email";

import { getEmailConfig, getInscripcionsPublicOrigin } from "../config";
import { requireEnvironmentVariable } from "../lib/env";
import { parsePhone } from "../lib/phone";
import "../lib/react-global";

export interface RegistrationRepository {
  create(registration: Registration): Promise<void>;
}

// Email-verification tokens are valid for 24 hours: long enough that
// someone who registers in the evening can still verify the next morning,
// short enough that a stale, unclaimed link doesn't stay usable forever.
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
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
        // A nicer "registration closed" response is IA-40's job — for now
        // this flows through the app's generic 500 handler like any other
        // repository error (see app.test.ts's "hides repository errors").
        throw new Error("No campaign is currently open for registration.");
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
      const created = await registrations.create({
        campaignId: openCampaign.id,
        email: registration.email,
        profileSnapshot,
      });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const verifications = createRegistrationVerificationRepository(db);
      await verifications.create({
        registrationId: created.id,
        tokenHash: hashVerificationToken(rawToken),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      });

      const link = `${getInscripcionsPublicOrigin()}/verificar?token=${rawToken}`;

      // Decision (IA-40): nothing past this point may roll back or fail the
      // request — `getEmailer()` construction (e.g. a misconfigured
      // RESEND_API_KEY) included. The registration row already exists in
      // `pending_email` — that's the durable, valuable side effect — and is
      // retryable via `POST /v1/registrations/:id/resend-verification`.
      // Rolling back (or returning a 5xx) on a transient or config-level
      // email failure would be strictly worse: retrying the whole
      // submission risks a duplicate-email conflict against the row that
      // actually did save, and the client has no way to tell "your data
      // wasn't saved" apart from "it was saved but the email hiccupped". So
      // this endpoint always returns 201 once the row is written; see
      // `createRegistrationRoute`'s doc comment in routes.ts for the
      // OpenAPI-facing side of this decision.
      try {
        const emailer = dependencies.emailer ?? getEmailer();
        await emailer.send({
          to: created.email,
          subject: "Verifica el teu correu — IAESTE LC Lleida",
          react: VerifyUserEmail({ email: created.email, link }),
        });
      } catch (error) {
        console.error("Failed to send verification email", error);
      }
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
    },
  };
}

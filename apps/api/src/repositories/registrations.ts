import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

import type { Registration } from "@repo/constants/validators/registration";
import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createRegistrationRepository,
  type RegistrationProfileSnapshot,
} from "@repo/db/repositories";

export interface RegistrationRepository {
  create(registration: Registration): Promise<void>;
}

/**
 * The default `RegistrationRepository`, backed by `@repo/db` (IA-12).
 * Writes land in `pending_email` status — the schema's default — and never
 * move further here; the email-verification / admin-review transitions are
 * IA-40's job.
 *
 * Critical: `getDb()` (and therefore `getDatabaseUrl()`, which throws
 * synchronously if `DATABASE_URL` is unset) is only ever called from inside
 * `.create()`, never at factory-construction time. `app.ts`'s
 * `createApp()` — and therefore this factory — runs unconditionally at
 * module-import time (see `apps/api/scripts/generate-openapi.ts`), so
 * resolving the database connection here eagerly would make merely
 * importing `app.ts` crash whenever `DATABASE_URL` isn't set. See
 * `app.test.ts`'s laziness test and `repositories/registrations.test.ts`.
 */
export function createDrizzleRegistrationRepository(): RegistrationRepository {
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

      const profileSnapshot: RegistrationProfileSnapshot = {
        name: registration.name,
        surnames: registration.surnames,
        // No phone-parsing library is wired up yet — real E.164 parsing
        // lands in IA-40. For now both fields just carry the raw submitted
        // string.
        phoneE164: registration.phone,
        phoneDisplay: registration.phone,
        degree: registration.degree,
        studyYear: registration.year,
        // `previousMember` is no longer supplied by the applicant (IA-40):
        // new vs. returning is now derived from membership history in
        // @repo/db, not asked on the form.
        note: registration.note,
      };

      const registrations = createRegistrationRepository(db);
      await registrations.create({
        campaignId: openCampaign.id,
        email: registration.email,
        profileSnapshot,
      });
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

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

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

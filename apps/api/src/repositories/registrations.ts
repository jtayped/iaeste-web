import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

import type { Registration } from "@repo/constants/validators/registration";

export interface RegistrationRepository {
  create(registration: Registration): Promise<void>;
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
              registration.previousMember,
              registration.note ?? "",
            ],
          ],
        },
      });
    },
  };
}

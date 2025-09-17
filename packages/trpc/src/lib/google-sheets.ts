import { User } from "@repo/constants/validators/user";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";

export async function appendUser(user: User) {
  try {
    const auth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/spreadsheets",
      credentials: {
        project_id: process.env.SHEETS_PROJECT_ID!,
        private_key: process.env.SHEETS_PRIVATE_KEY!,
        client_email: process.env.SHEETS_CLIENT_EMAIL!,
      },
    });

    const service = google.sheets({ version: "v4", auth });
    const result = service.spreadsheets.values.append({
      spreadsheetId: "1kP9mPPFvpz102S6zowdz0KZmtFhuHV2sSf_GEU8VIww",
      range: "inscripcions",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [Object.values(user)],
      },
    });

    return result;
  } catch (error) {
    console.error(error);
  }
}

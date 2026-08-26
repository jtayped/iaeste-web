import { requireEnvironmentVariable } from "./lib/env";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3003"];

export function getAllowedOrigins(value = process.env.CORS_ALLOWED_ORIGINS) {
  if (!value) return DEFAULT_ALLOWED_ORIGINS;

  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function getApiPort(value = process.env.API_PORT) {
  if (!value) return 3004;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("API_PORT must be an integer between 1 and 65535");
  }

  return port;
}

/**
 * Public origin of `apps/inscripcions`, used to build the email-verification
 * link (`${origin}/verificar#token=...`). The fragment keeps the raw token out
 * of HTTP requests and server logs. Distinct from `apps/inscripcions`'s
 * own `NEXT_PUBLIC_API_URL` (that's the frontend's pointer back to *this*
 * API) — this is the API pointing forward at the frontend, which is why it
 * needs its own variable rather than reusing an existing one.
 */
export function getInscripcionsPublicOrigin(
  value = process.env.INSCRIPCIONS_PUBLIC_ORIGIN,
): string {
  return (value ?? "http://localhost:3003").replace(/\/$/, "");
}

/**
 * Placeholder origin for the first-login link sent in the acceptance email.
 * There is no real admin app or magic-link auth yet (IA-30/IA-31 build
 * that) — this just needs to point somewhere sane so the email isn't
 * broken, and is documented as a placeholder wherever it's used.
 */
export function getAdminPublicOrigin(
  value = process.env.ADMIN_PUBLIC_ORIGIN,
): string {
  return (value ?? "http://localhost:3005").replace(/\/$/, "");
}

export interface EmailConfig {
  apiKey: string;
  from: string;
}

/** Resend configuration for every email `apps/api` sends. */
export function getEmailConfig(): EmailConfig {
  return {
    apiKey: requireEnvironmentVariable("RESEND_API_KEY"),
    from: requireEnvironmentVariable("REGISTRATION_EMAIL_FROM"),
  };
}

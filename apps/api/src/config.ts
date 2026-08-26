import { requireEnvironmentVariable } from "./lib/env";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3003"];
const DEFAULT_AUTH_TRUSTED_ORIGINS = ["http://localhost:3005"];

function parseOriginList(value: string | undefined, defaults: string[]) {
  if (!value) return defaults;

  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function getAllowedOrigins(value = process.env.CORS_ALLOWED_ORIGINS) {
  return parseOriginList(value, DEFAULT_ALLOWED_ORIGINS);
}

export function getAuthTrustedOrigins(
  value = process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  runtime = getRuntimeEnvironment(),
) {
  if (!value && runtime === "production") {
    requireEnvironmentVariable("BETTER_AUTH_TRUSTED_ORIGINS");
  }
  const origins = parseOriginList(value, DEFAULT_AUTH_TRUSTED_ORIGINS);
  return origins.map((origin) => {
    if (origin.includes("*")) {
      throw new Error("BETTER_AUTH_TRUSTED_ORIGINS cannot contain wildcards");
    }
    const url = new URL(origin);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error(
        "BETTER_AUTH_TRUSTED_ORIGINS entries must be http(s) origins",
      );
    }
    return url.origin;
  });
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
 * link (`${origin}/verificar?token=...`). Distinct from `apps/inscripcions`'s
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
 * Browser-visible origin of the admin app. Acceptance email and Better Auth
 * links both enter through this origin. IA-31 adds the same-origin rewrite
 * from `/api/auth/*` to `apps/api`.
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

/**
 * Stable browser-visible auth origin. Better Auth runs inside `apps/api`, but
 * the browser reaches it through `apps/admin`'s same-origin rewrite.
 */
export function getAuthBaseUrl(
  value = process.env.ADMIN_PUBLIC_ORIGIN,
  runtime = getRuntimeEnvironment(),
): string {
  if (!value && runtime === "production") {
    requireEnvironmentVariable("ADMIN_PUBLIC_ORIGIN");
  }
  const configured = value ?? "http://localhost:3005";
  const url = new URL(configured);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "ADMIN_PUBLIC_ORIGIN must be an http(s) origin without a path",
    );
  }
  return url.origin;
}

/** Validates the runtime before cookie policy is derived from it. */
export function getRuntimeEnvironment(
  value = process.env.NODE_ENV,
): "development" | "test" | "production" {
  if (!value) return "development";
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }
  throw new Error("NODE_ENV must be development, test, or production");
}

/**
 * Signs Better Auth's session data. Must be a long, random secret in production.
 * Generate one with
 * `openssl rand -base64 32`.
 */
export function getAuthSecret(value = process.env.BETTER_AUTH_SECRET): string {
  const secret = (
    value ?? requireEnvironmentVariable("BETTER_AUTH_SECRET")
  ).trim();
  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long");
  }
  return secret;
}

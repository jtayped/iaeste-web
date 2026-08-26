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

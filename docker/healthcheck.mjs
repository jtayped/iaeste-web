// Exits 0 when the URL given as the only argument answers 2xx, and 1 for
// anything else, including no answer within four seconds.
//
// Both the image's HEALTHCHECK and Coolify's health check run this. The slim
// base image ships neither curl nor wget, and Coolify's command check only
// accepts letters, digits, spaces and `-_./:=@,+`, so `node -e "fetch(...)"`
// is not an option there. `node /app/healthcheck.mjs http://127.0.0.1:3004/health`
// passes that filter.
const url = process.argv[2];

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
  process.exit(response.ok ? 0 : 1);
} catch {
  process.exit(1);
}

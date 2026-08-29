import config from "@payload-config";
import { getPayload } from "payload";

export const dynamic = "force-dynamic";

// Bumped by hand with the app version. The public probe reports it so an
// operator can tell which image is actually serving; nothing branches on it.
const VERSION = "0.1.0";

/**
 * Liveness + database readiness for the Docker HEALTHCHECK and the Coolify
 * probe. A bounded `count` against the smallest collection proves Postgres is
 * reachable and that migrations have produced a usable schema. The public body
 * carries only status and version — a failing query's detail stays in the
 * server log, never in the response.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const payload = await getPayload({ config });

    await Promise.race([
      payload.count({ collection: "users", overrideAccess: true }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("health query timed out")), 2_000),
      ),
    ]);

    return Response.json({
      status: "ok",
      version: VERSION,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[cms] health check failed", {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown error",
    });

    return Response.json(
      { status: "error", version: VERSION },
      { status: 503 },
    );
  }
}

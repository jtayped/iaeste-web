import type { BlogError } from "@repo/constants/validators/blog";

/** Conservative caching for public reads. The web client also caches for 60s. */
export const PUBLIC_CACHE_HEADERS = {
  "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

const NO_STORE = { "cache-control": "no-store" } as const;

export function requestIdFrom(req: Request): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function jsonOk(data: unknown): Response {
  return Response.json(data, { headers: PUBLIC_CACHE_HEADERS });
}

export function jsonError(
  code: BlogError["error"]["code"],
  message: string,
  requestId: string,
  status: number,
): Response {
  const body: BlogError = { error: { code, message, requestId } };
  return Response.json(body, { status, headers: NO_STORE });
}

/** Log an upstream failure with its request id, then return a 502 body. */
export function upstreamFailure(
  scope: string,
  error: unknown,
  requestId: string,
): Response {
  console.error(`[cms] public ${scope} failed`, {
    requestId,
    error: error instanceof Error ? error.message : "unknown error",
  });
  return jsonError(
    "upstream_unavailable",
    "el servei de blog no està disponible",
    requestId,
    502,
  );
}

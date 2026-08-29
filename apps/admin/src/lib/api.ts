import { createApiClient } from "@repo/api-client";

/**
 * Browser-side client for the domain routes.
 *
 * The base URL is the relative `"/api"`, not `API_INTERNAL_URL`: the browser
 * only ever speaks to the admin origin, and `next.config.ts` rewrites
 * `/api/v1/*` onwards to the API's `/v1/*`. So a generated path of
 * `/v1/admin/members` is requested as `/api/v1/admin/members` and arrives as
 * `/v1/admin/members`. The session cookie rides along because the request is
 * same-origin.
 *
 * Server components must not use this — a relative URL has nothing to resolve
 * against on the server. Use `getServerApiClient()` from `./api.server`, which
 * targets the API directly and forwards the incoming cookie.
 */
export const apiClient = createApiClient("/api");

/**
 * Extra options for a POST that carries no request body.
 *
 * The API validates `Content-Type` on every POST — including the action routes
 * that take no body at all (`.../restore`, `.../archive`, `.../current`,
 * `.../resend`, `.../cancel`). Those are typed `requestBody?: never`, so there
 * is no `body` to pass; without one `openapi-fetch` sends no `Content-Type`
 * header, and the request comes back `415 UNSUPPORTED_MEDIA_TYPE`.
 *
 * Verified against the running API: the same call 415s bare and returns 200
 * with this header set. Spreading this into those calls is the whole fix.
 */
export const NO_BODY_POST = {
  headers: { "content-type": "application/json" },
} as const;

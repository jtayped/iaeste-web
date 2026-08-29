import { cookies } from "next/headers";

import { createApiClient } from "@repo/api-client";
import { env } from "@repo/env/admin/server";

/**
 * Per-request client for server components.
 *
 * Unlike the browser client this one skips the rewrite and calls the API
 * directly, so it has to carry the session itself: `fetch` on the server has
 * no cookie jar, and the incoming request's `Cookie` header is the only proof
 * of who is asking. The middleware below copies it onto every outgoing call.
 *
 * It is a *per-request* client on purpose — the cookie is bound at
 * construction, so a module-level singleton would serve one user's session to
 * whoever came next. Call this inside the component that needs it.
 */
export async function getServerApiClient() {
  const cookieHeader = (await cookies()).toString();
  const client = createApiClient(env.API_INTERNAL_URL);

  client.use({
    onRequest({ request }) {
      if (cookieHeader) request.headers.set("cookie", cookieHeader);
      return request;
    },
  });

  return client;
}

import { cache } from "react";

import { getServerApiClient } from "./api.server";
import type { OverviewResult } from "./overview";

/**
 * Fetches `GET /v1/admin/overview` for a server component through the
 * generated client (which forwards the session cookie — see
 * `./api.server`). `cache()`d because the authenticated layout (sidebar
 * badge, header campaign context) and the dashboard page (stat cards) both
 * need these numbers: one request per render pass, not two.
 */
export const fetchOverview = cache(async (): Promise<OverviewResult> => {
  const client = await getServerApiClient();

  let result;
  try {
    result = await client.GET("/v1/admin/overview", { cache: "no-store" });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "error desconegut",
    };
  }

  const status = result.response.status;
  if (status === 401 || status === 403) return { status: "forbidden" };
  if (result.error || !result.data) {
    return { status: "error", message: `l'api ha respost ${status}` };
  }
  return { status: "ok", overview: result.data };
});

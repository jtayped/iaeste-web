import { cache } from "react";

import { getServerApiClient } from "./api.server";
import type { CrmAnalyticsResult } from "./analytics";

/**
 * Fetches `GET /v1/admin/analytics/crm` for a server component through the
 * generated client (which forwards the session cookie — see `./api.server`).
 * Shaped after `fetchOverview`, with one extra branch: a 503 carrying
 * `UPSTREAM_UNAVAILABLE` is Odoo being unconfigured or unreachable, which is
 * somebody else's outage and gets its own screen rather than our generic
 * "no s'ha pogut carregar".
 *
 * `cache()`d so a future layout or sibling component reading the same snapshot
 * costs one request per render pass. The API already serves it from a ~5 min
 * in-process cache, so this never hammers Odoo either way.
 */
export const fetchCrmAnalytics = cache(
  async (): Promise<CrmAnalyticsResult> => {
    const client = await getServerApiClient();

    let result;
    try {
      result = await client.GET("/v1/admin/analytics/crm", {
        cache: "no-store",
      });
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "error desconegut",
      };
    }

    const status = result.response.status;
    if (status === 401 || status === 403) return { status: "forbidden" };

    if (result.error?.error.code === "UPSTREAM_UNAVAILABLE") {
      return { status: "unavailable", message: result.error.error.message };
    }

    if (result.error || !result.data) {
      return { status: "error", message: `l'api ha respost ${status}` };
    }

    return { status: "ok", analytics: result.data };
  },
);

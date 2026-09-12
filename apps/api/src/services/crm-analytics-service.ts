import {
  buildCrmAnalytics,
  type CrmAnalytics,
  type OdooLeadRow,
  type OdooStageRow,
  type OdooWonLeadRow,
} from "../lib/crm-metrics";
import { WON_STAGE_ID } from "../lib/crm-stages";
import { createOdooClient, type OdooClient } from "../lib/odoo";
import { createTtlCache, type TtlCache } from "../lib/ttl-cache";

/**
 * Reads the Odoo CRM pipeline and turns it into the admin analytics snapshot.
 *
 * Four Odoo calls, run in series (see `read` for why), behind a short cache.
 * Odoo's data changes at most daily — in practice it has not changed in
 * months — and a cold read is roughly half a second, so five minutes makes a
 * reload instant without ever showing something meaningfully wrong.
 */

/** Short enough that nobody is looking at yesterday's pipeline. */
export const ANALYTICS_TTL_MS = 5 * 60_000;

/**
 * Ceiling on the active-lead read. Currently 257 rows, so this is slack, not
 * a constraint — but if it is ever hit the snapshot sets `truncated` and the
 * page says so rather than quietly under-reporting.
 */
export const ACTIVE_LEAD_LIMIT = 1_000;

export interface CrmAnalyticsService {
  /**
   * The current snapshot. Serves a cached one inside the TTL; on a miss with
   * Odoo unreachable, falls back to the last good snapshot marked
   * `stale: true`. Throws only when there is nothing at all to serve.
   */
  snapshot(): Promise<CrmAnalytics>;
}

export interface CrmAnalyticsServiceDependencies {
  odoo?: OdooClient;
  cache?: TtlCache<CrmAnalytics>;
  now?: () => number;
  logger?: Pick<Console, "error">;
}

export function createCrmAnalyticsService(
  dependencies: CrmAnalyticsServiceDependencies = {},
): CrmAnalyticsService {
  // Lazy getters, never eager values: `createApp()` runs at module scope and
  // `scripts/generate-openapi.ts` imports it, so constructing a client (which
  // resolves `getOdooConfig()`, and that throws on a partial config) at this
  // point would break `npm run generate:api` whenever Odoo is unconfigured.
  let client: OdooClient | undefined;
  const odoo = () => dependencies.odoo ?? (client ??= createOdooClient());
  const cache =
    dependencies.cache ?? createTtlCache<CrmAnalytics>(ANALYTICS_TTL_MS);
  const clock = dependencies.now ?? (() => Date.now());
  const logger = dependencies.logger ?? console;

  async function read(): Promise<CrmAnalytics> {
    const odooClient = odoo();
    // Archived leads are the bulk of the history, so every retrospective read
    // turns off Odoo's default `active_test` filter.
    const allLeads = { active_test: false } as const;

    // Sequential, deliberately. Odoo Online throttles concurrent requests per
    // database — four of these in a `Promise.all` reliably returns 429, while
    // the same four in series complete in ~400ms. Since the result is cached
    // for minutes, the parallelism bought ~200ms and cost every cold read.
    const stages = await odooClient.searchRead<OdooStageRow>("crm.stage", {
      fields: ["id", "name"],
    });
    const activeLeads = await odooClient.searchRead<OdooLeadRow>("crm.lead", {
      fields: [
        "id",
        "name",
        "partner_name",
        "stage_id",
        "user_id",
        "write_date",
      ],
      limit: ACTIVE_LEAD_LIMIT,
      order: "write_date asc",
    });
    const stageTotals = await odooClient.readGroup("crm.lead", {
      aggregates: ["__count"],
      context: allLeads,
      groupby: ["stage_id"],
    });
    const wonLeads = await odooClient.searchRead<OdooWonLeadRow>("crm.lead", {
      context: allLeads,
      domain: [["stage_id", "=", WON_STAGE_ID]],
      fields: ["id", "day_close"],
    });

    return buildCrmAnalytics(
      {
        activeLeads,
        activeLimit: ACTIVE_LEAD_LIMIT,
        stages,
        stageTotals,
        wonLeads,
      },
      clock(),
    );
  }

  return {
    async snapshot() {
      const fresh = cache.fresh(clock());
      if (fresh) return fresh.value;

      try {
        const snapshot = await cache.loadOnce(read);
        cache.put(snapshot, clock());
        return snapshot;
      } catch (error) {
        // A stale snapshot, clearly labelled, beats an error page — the
        // numbers here describe months of history, not the last five minutes.
        const previous = cache.last();
        if (previous) {
          logger.error("crm analytics: serving a stale snapshot", error);
          return { ...previous.value, stale: true };
        }
        throw error;
      }
    },
  };
}

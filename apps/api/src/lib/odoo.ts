import { getOdooConfig, type OdooConfig } from "../config";

/**
 * The only module in this repo that speaks Odoo.
 *
 * Talks the **JSON-2 API** (`POST /json/2/<model>/<method>`), introduced in
 * Odoo 19 and the designated replacement for `/xmlrpc/2` and `/jsonrpc`, both
 * of which Odoo removes in Online 21.1 (winter 2027). Unlike those, JSON-2 is
 * plain HTTP: no RPC envelope, no `uid` handshake, no `common.authenticate()`
 * round trip — the API key alone authenticates each call, and the response is
 * the bare return value of the model method.
 *
 * Everything here is read-only on purpose. Nothing in this codebase writes to
 * Odoo; the CRM is the system of record for company outreach and this is a
 * reporting pull. Keep it that way — adding a write path means revisiting the
 * API key's permissions, which are deliberately minimal.
 */

/** A resolved many2one field: `[id, display_name]`, or `false` when unset. */
export type OdooMany2One = [number, string] | false;

/** One row from a grouped read. Keys depend on the `groupby` and aggregates. */
export type OdooGroupRow = Record<string, unknown>;

/**
 * Odoo's evaluation context. `active_test: false` is the important one —
 * without it every search silently hides archived records, which on this
 * database means seeing 257 of 1,149 leads.
 */
export interface OdooContext {
  active_test?: boolean;
  lang?: string;
  tz?: string;
}

export interface SearchReadParams {
  domain?: unknown[];
  fields: string[];
  limit?: number;
  offset?: number;
  order?: string;
  context?: OdooContext;
}

export interface ReadGroupParams {
  domain?: unknown[];
  groupby: string[];
  /** e.g. `["__count", "write_date:max"]`. */
  aggregates?: string[];
  limit?: number;
  order?: string;
  context?: OdooContext;
}

export interface OdooClient {
  searchCount(
    model: string,
    domain?: unknown[],
    context?: OdooContext,
  ): Promise<number>;
  searchRead<T = Record<string, unknown>>(
    model: string,
    params: SearchReadParams,
  ): Promise<T[]>;
  /**
   * `formatted_read_group` — the Odoo 19 name for a grouped aggregate read.
   * Does the GROUP BY inside Odoo so we pull a dozen rows instead of 1,149.
   */
  readGroup(model: string, params: ReadGroupParams): Promise<OdooGroupRow[]>;
}

/** Raised when `ODOO_*` is unset: the integration is off, not broken. */
export class OdooNotConfiguredError extends Error {
  constructor() {
    super("Odoo is not configured");
    this.name = "OdooNotConfiguredError";
  }
}

/**
 * An error Odoo itself returned, or a transport failure reaching it.
 *
 * Odoo's error bodies carry a `debug` field holding a full Python traceback.
 * It is deliberately **not** captured here: it would otherwise reach our logs
 * and, via any careless handler, a response body. `odooName` (e.g.
 * `odoo.exceptions.AccessError`) is the part worth keeping.
 */
export class OdooError extends Error {
  readonly status: number;
  readonly odooName: string | undefined;

  constructor(message: string, status: number, odooName?: string) {
    super(message);
    this.name = "OdooError";
    this.status = status;
    this.odooName = odooName;
  }
}

export interface OdooClientDependencies {
  /**
   * Resolved lazily, never at construction time. `app.ts` ends with
   * `const app = createApp()` at module scope and `scripts/generate-openapi.ts`
   * imports it, so reading config eagerly would make `npm run generate:api`
   * — and every test file that imports `app.ts` — crash whenever Odoo is
   * unconfigured. Unlike `getWebPushConfig()`, which `createApp()` may call
   * eagerly because it returns `null`, `getOdooConfig()` throws on a partial
   * config and must stay behind this closure.
   */
  config?: () => OdooConfig | null;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

/** Odoo Online sits behind a proxy; 8s is generous for an aggregate read. */
const DEFAULT_TIMEOUT_MS = 8_000;

function errorFromBody(body: unknown, status: number): OdooError {
  if (body && typeof body === "object" && "message" in body) {
    const { message, name } = body as { message?: unknown; name?: unknown };
    return new OdooError(
      typeof message === "string" ? message : `Odoo responded ${status}`,
      status,
      typeof name === "string" ? name : undefined,
    );
  }
  return new OdooError(`Odoo responded ${status}`, status);
}

export function createOdooClient(
  deps: OdooClientDependencies = {},
): OdooClient {
  const resolveConfig = deps.config ?? (() => getOdooConfig());
  const doFetch = deps.fetch ?? globalThis.fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function call<T>(
    model: string,
    method: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const config = resolveConfig();
    if (!config) throw new OdooNotConfiguredError();

    let response: Response;
    try {
      response = await doFetch(`${config.baseUrl}/json/2/${model}/${method}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${config.apiKey}`,
          "x-odoo-database": config.database,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // Network failure, DNS, or the abort above. The cause carries no useful
      // detail for a caller and may name internal hosts, so it is not attached.
      const reason = error instanceof Error ? error.message : "unknown error";
      throw new OdooError(`Could not reach Odoo: ${reason}`, 0);
    }

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) throw errorFromBody(parsed, response.status);

    // JSON-2 returns the method's bare return value: a number for
    // `search_count`, an array for the reads. There is no `result` wrapper.
    return parsed as T;
  }

  return {
    async searchCount(model, domain = [], context) {
      const count = await call<number>(model, "search_count", {
        domain,
        ...(context ? { context } : {}),
      });
      if (typeof count !== "number") {
        throw new OdooError(
          `Expected a count from ${model}, got ${typeof count}`,
          200,
        );
      }
      return count;
    },

    async searchRead(model, params) {
      const rows = await call<unknown>(model, "search_read", {
        domain: params.domain ?? [],
        fields: params.fields,
        ...(params.limit === undefined ? {} : { limit: params.limit }),
        ...(params.offset === undefined ? {} : { offset: params.offset }),
        ...(params.order === undefined ? {} : { order: params.order }),
        ...(params.context ? { context: params.context } : {}),
      });
      if (!Array.isArray(rows)) {
        throw new OdooError(
          `Expected rows from ${model}, got a non-array`,
          200,
        );
      }
      return rows;
    },

    async readGroup(model, params) {
      const rows = await call<unknown>(model, "formatted_read_group", {
        domain: params.domain ?? [],
        groupby: params.groupby,
        aggregates: params.aggregates ?? ["__count"],
        ...(params.limit === undefined ? {} : { limit: params.limit }),
        ...(params.order === undefined ? {} : { order: params.order }),
        ...(params.context ? { context: params.context } : {}),
      });
      if (!Array.isArray(rows)) {
        throw new OdooError(
          `Expected groups from ${model}, got a non-array`,
          200,
        );
      }
      return rows as OdooGroupRow[];
    },
  };
}

/** `[7, "Joan Gaya"]` → `7`; `false` (unassigned) → `null`. */
export function many2oneId(value: unknown): number | null {
  return Array.isArray(value) && typeof value[0] === "number" ? value[0] : null;
}

/** `[7, "Joan Gaya"]` → `"Joan Gaya"`; `false` → `null`. */
export function many2oneLabel(value: unknown): string | null {
  return Array.isArray(value) && typeof value[1] === "string" ? value[1] : null;
}

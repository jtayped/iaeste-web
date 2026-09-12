import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createOdooClient,
  many2oneId,
  many2oneLabel,
  OdooError,
  OdooNotConfiguredError,
  type OdooClientDependencies,
} from "./odoo";

/**
 * These tests inject a fake through `deps.fetch` rather than reaching for a
 * global patch or an HTTP mocking library — `fetch` is this module's declared
 * dependency, so it is also its test seam. Everything above this layer fakes
 * the `OdooClient` interface instead and never sees HTTP at all.
 */

const CONFIG = {
  baseUrl: "https://example.odoo.com",
  database: "testdb",
  apiKey: "test-key",
};

interface Recorded {
  url: string;
  init: RequestInit;
}

function clientWith(
  respond: (recorded: Recorded) => Response,
  overrides: Partial<OdooClientDependencies> = {},
) {
  const calls: Recorded[] = [];
  const client = createOdooClient({
    config: () => CONFIG,
    fetch: (async (url: string | URL | Request, init: RequestInit = {}) => {
      const recorded = { url: String(url), init };
      calls.push(recorded);
      return respond(recorded);
    }) as unknown as typeof globalThis.fetch,
    ...overrides,
  });
  return { calls, client };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("createOdooClient", () => {
  it("posts to the JSON-2 path with bearer auth and the database header", async () => {
    const { calls, client } = clientWith(() => json(257));

    const count = await client.searchCount("crm.lead");

    assert.equal(count, 257);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0]!.url,
      "https://example.odoo.com/json/2/crm.lead/search_count",
    );
    assert.equal(calls[0]!.init.method, "POST");
    const headers = calls[0]!.init.headers as Record<string, string>;
    assert.equal(headers.authorization, "bearer test-key");
    assert.equal(headers["x-odoo-database"], "testdb");
    assert.equal(headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { domain: [] });
  });

  it("reads the bare return value, not a JSON-RPC envelope", async () => {
    // A `{"result": …}` wrapper would mean the legacy /jsonrpc endpoint.
    const { client } = clientWith(() => json([{ id: 1, name: "samca" }]));

    const rows = await client.searchRead("crm.lead", { fields: ["name"] });

    assert.deepEqual(rows, [{ id: 1, name: "samca" }]);
  });

  it("groups through formatted_read_group and defaults to a count aggregate", async () => {
    const { calls, client } = clientWith(() =>
      json([{ __count: 172, stage_id: [44, "Prospectes"] }]),
    );

    await client.readGroup("crm.lead", { groupby: ["stage_id"] });

    assert.equal(
      calls[0]!.url,
      "https://example.odoo.com/json/2/crm.lead/formatted_read_group",
    );
    assert.deepEqual(JSON.parse(calls[0]!.init.body as string), {
      domain: [],
      groupby: ["stage_id"],
      aggregates: ["__count"],
    });
  });

  it("passes active_test through so archived records are included", async () => {
    const { calls, client } = clientWith(() => json(1149));

    await client.searchCount("crm.lead", [], { active_test: false });

    const body = JSON.parse(calls[0]!.init.body as string);
    assert.deepEqual(body.context, { active_test: false });
  });

  it("omits optional parameters rather than sending undefined", async () => {
    const { calls, client } = clientWith(() => json([]));

    await client.searchRead("crm.lead", { fields: ["name"], limit: 3 });

    const body = JSON.parse(calls[0]!.init.body as string);
    assert.deepEqual(Object.keys(body).sort(), ["domain", "fields", "limit"]);
  });

  it("maps an Odoo error body to OdooError and keeps the exception name", async () => {
    const { client } = clientWith(() =>
      json(
        {
          name: "odoo.exceptions.AccessError",
          message: "You are not allowed to access 'Mail Tracking Value'.",
          debug: "Traceback (most recent call last):\n  File /home/odoo/…",
        },
        403,
      ),
    );

    const error = await client
      .searchCount("mail.tracking.value")
      .then(() => null)
      .catch((caught: unknown) => caught);

    assert.ok(error instanceof OdooError);
    assert.equal(error.status, 403);
    assert.equal(error.odooName, "odoo.exceptions.AccessError");
    assert.match(error.message, /not allowed to access/);
  });

  it("never carries the Python traceback off the client", async () => {
    // Odoo's `debug` field is a full traceback naming internal paths; it must
    // not reach a log line or, through a careless handler, a response body.
    const { client } = clientWith(() =>
      json(
        {
          name: "odoo.exceptions.AccessError",
          message: "denied",
          debug: "Traceback (most recent call last): /home/odoo/src/odoo/…",
        },
        403,
      ),
    );

    const error = (await client
      .searchCount("crm.lead")
      .catch((caught: unknown) => caught)) as OdooError;

    const serialised = JSON.stringify({
      message: error.message,
      name: error.name,
      odooName: error.odooName,
      stack: error.stack,
      status: error.status,
    });
    assert.doesNotMatch(serialised, /Traceback/);
    assert.doesNotMatch(serialised, /home\/odoo/);
  });

  it("reports an invalid api key as a 401 rather than a crash", async () => {
    const { client } = clientWith(() =>
      json(
        { name: "werkzeug.exceptions.Unauthorized", message: "Invalid apikey" },
        401,
      ),
    );

    const error = (await client
      .searchCount("crm.lead")
      .catch((caught: unknown) => caught)) as OdooError;

    assert.ok(error instanceof OdooError);
    assert.equal(error.status, 401);
    assert.equal(error.message, "Invalid apikey");
  });

  it("survives a non-JSON error page from a proxy", async () => {
    const { client } = clientWith(
      () => new Response("<html>502 Bad Gateway</html>", { status: 502 }),
    );

    const error = (await client
      .searchCount("crm.lead")
      .catch((caught: unknown) => caught)) as OdooError;

    assert.ok(error instanceof OdooError);
    assert.equal(error.status, 502);
  });

  it("turns a transport failure into an OdooError with no status", async () => {
    const client = createOdooClient({
      config: () => CONFIG,
      fetch: (() => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof globalThis.fetch,
    });

    const error = (await client
      .searchCount("crm.lead")
      .catch((caught: unknown) => caught)) as OdooError;

    assert.ok(error instanceof OdooError);
    assert.equal(error.status, 0);
    assert.match(error.message, /Could not reach Odoo/);
  });

  it("rejects a count that did not come back as a number", async () => {
    const { client } = clientWith(() => json({ unexpected: true }));

    await assert.rejects(
      () => client.searchCount("crm.lead"),
      (error: unknown) => error instanceof OdooError,
    );
  });

  it("throws OdooNotConfiguredError without attempting a request", async () => {
    let attempted = false;
    const client = createOdooClient({
      config: () => null,
      fetch: (() => {
        attempted = true;
        return Promise.resolve(json(1));
      }) as unknown as typeof globalThis.fetch,
    });

    await assert.rejects(
      () => client.searchCount("crm.lead"),
      (error: unknown) => error instanceof OdooNotConfiguredError,
    );
    assert.equal(attempted, false);
  });

  it("does not read configuration until a call is made", () => {
    // `app.ts` calls `createApp()` at module scope and the OpenAPI generator
    // imports it, so constructing the client must not read config — otherwise
    // `npm run generate:api` fails whenever Odoo is unconfigured.
    let reads = 0;
    createOdooClient({
      config: () => {
        reads += 1;
        return null;
      },
    });
    assert.equal(reads, 0);
  });
});

describe("many2one helpers", () => {
  it("reads the id and label out of a resolved many2one", () => {
    assert.equal(many2oneId([7, "Joan Gaya"]), 7);
    assert.equal(many2oneLabel([7, "Joan Gaya"]), "Joan Gaya");
  });

  it("treats an unset many2one as null on both halves", () => {
    // `user_id: false` is how Odoo reports the 144 unassigned leads.
    assert.equal(many2oneId(false), null);
    assert.equal(many2oneLabel(false), null);
    assert.equal(many2oneId(undefined), null);
    assert.equal(many2oneLabel(null), null);
  });
});

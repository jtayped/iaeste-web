import assert from "node:assert/strict";
import { test } from "node:test";

import { APIError, type CollectionBeforeChangeHook } from "payload";

import { requireCatalanToPublish } from "./validate-document";

type HookArgs = Parameters<CollectionBeforeChangeHook>[0];

const gate = requireCatalanToPublish({ title: "títol", body: "text" });

const complete = { title: "sis mesos a munic", body: { root: {} } };

type FakeReq = {
  locale: string;
  fallbackLocale: string | false;
  payload: {
    findByID: (args: {
      locale: string;
      req: FakeReq;
    }) => Promise<Record<string, unknown>>;
  };
};

/**
 * A stand-in for the hook's `req`. `findByID` mimics Payload's Local API,
 * which sets `req.locale` and `req.fallbackLocale` on the request it is given.
 */
function fakeReq(locale: string, catalan: Record<string, unknown> = {}) {
  const reads: unknown[] = [];
  const req: FakeReq = {
    locale,
    fallbackLocale: "ca",
    payload: {
      findByID: async (args) => {
        reads.push(args);
        args.req.locale = args.locale;
        args.req.fallbackLocale = false;
        return catalan;
      },
    },
  };
  return { req, reads };
}

function run(args: {
  req: unknown;
  data: Record<string, unknown>;
  originalDoc?: Record<string, unknown>;
}) {
  return gate({
    ...args,
    collection: { slug: "experiences" },
  } as unknown as HookArgs);
}

function rejectsWith(pattern: RegExp) {
  return (error: unknown) =>
    error instanceof APIError &&
    error.status === 400 &&
    pattern.test(error.message);
}

test("drafts are never checked", async () => {
  const { req } = fakeReq("es");
  const data = { _status: "draft" };
  assert.equal(await run({ req, data }), data);
});

test("publishing a new document from es is refused", async () => {
  const { req, reads } = fakeReq("es");
  await assert.rejects(
    run({ req, data: { _status: "published", ...complete } }),
    rejectsWith(/encara no hi ha res en català/),
  );
  assert.equal(reads.length, 0);
});

test("publishing in ca checks the incoming data over the stored document", async () => {
  const { req } = fakeReq("ca");
  const data = { _status: "published", title: "sis mesos a munic" };
  assert.equal(
    await run({ req, data, originalDoc: { id: 7, body: { root: {} } } }),
    data,
  );
  await assert.rejects(
    run({ req, data: { _status: "published", title: " " } }),
    rejectsWith(/falten camps en català \(títol, text\)/),
  );
});

test("publishing an existing document from es checks its stored Catalan version", async () => {
  const { req, reads } = fakeReq("es", { title: "", body: { root: {} } });
  await assert.rejects(
    run({
      req,
      data: { _status: "published", ...complete },
      originalDoc: { id: 7 },
    }),
    rejectsWith(/falten camps en català \(títol\)/),
  );
  assert.equal(reads.length, 1);
});

test("reading the Catalan version leaves the request on its own locale", async () => {
  const { req } = fakeReq("es", complete);
  await run({
    req,
    data: { _status: "published", ...complete },
    originalDoc: { id: 7 },
  });
  assert.equal(req.locale, "es");
  assert.equal(req.fallbackLocale, "ca");
});

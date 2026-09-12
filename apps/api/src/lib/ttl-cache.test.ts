import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTtlCache } from "./ttl-cache";

const TTL = 60_000;

describe("createTtlCache", () => {
  it("returns an entry while it is inside the TTL", () => {
    const cache = createTtlCache<string>(TTL);
    cache.put("snapshot", 1_000);

    assert.equal(cache.fresh(1_000)?.value, "snapshot");
    assert.equal(cache.fresh(60_999)?.value, "snapshot");
  });

  it("treats the TTL boundary as expired", () => {
    const cache = createTtlCache<string>(TTL);
    cache.put("snapshot", 1_000);

    assert.equal(cache.fresh(61_000), undefined);
    assert.equal(cache.fresh(120_000), undefined);
  });

  it("keeps an expired entry available as the stale fallback", () => {
    // This is what lets the endpoint serve an old snapshot, flagged stale,
    // instead of a 503 when Odoo is unreachable.
    const cache = createTtlCache<string>(TTL);
    cache.put("snapshot", 1_000);

    assert.equal(cache.fresh(999_000), undefined);
    assert.equal(cache.last()?.value, "snapshot");
    assert.equal(cache.last()?.storedAt, 1_000);
  });

  it("has nothing before the first put", () => {
    const cache = createTtlCache<string>(TTL);

    assert.equal(cache.fresh(0), undefined);
    assert.equal(cache.last(), undefined);
  });

  it("collapses concurrent loads onto a single call", async () => {
    const cache = createTtlCache<number>(TTL);
    let loads = 0;
    let release: (value: number) => void = () => {};
    const load = () => {
      loads += 1;
      return new Promise<number>((resolve) => {
        release = resolve;
      });
    };

    const first = cache.loadOnce(load);
    const second = cache.loadOnce(load);
    release(7);

    assert.deepEqual(await Promise.all([first, second]), [7, 7]);
    assert.equal(loads, 1);
  });

  it("lets the next caller retry after a failed load", async () => {
    const cache = createTtlCache<number>(TTL);
    let loads = 0;
    const load = () => {
      loads += 1;
      return loads === 1
        ? Promise.reject(new Error("odoo is down"))
        : Promise.resolve(42);
    };

    await assert.rejects(() => cache.loadOnce(load), /odoo is down/);
    // The in-flight slot must have been cleared, not left holding a rejection.
    assert.equal(await cache.loadOnce(load), 42);
    assert.equal(loads, 2);
  });

  it("does not store anything on its own — loadOnce and put are separate", async () => {
    const cache = createTtlCache<number>(TTL);

    await cache.loadOnce(async () => 1);

    assert.equal(cache.last(), undefined);
  });
});

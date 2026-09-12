/**
 * A one-slot, in-memory cache with a TTL and in-flight de-duplication.
 *
 * In-process and memory-only, like `rate-limit.ts`: there is one API
 * container and no traffic, so a `Map` — here, a single slot — is enough and
 * no Redis is needed. A restart drops the entry, which only ever costs one
 * cold read.
 *
 * Unlike `rate-limit.ts` this is **instance-scoped, not module-scoped**. The
 * cache is created inside the service that owns it. In production that is the
 * same thing (`createApp()` runs once), but tests construct an app per case,
 * and module-level state would leak one test's snapshot into the next.
 *
 * `now` is injectable throughout so expiry can be tested without fake timers,
 * matching the convention in `rate-limit.ts`.
 */

export interface CacheEntry<T> {
  value: T;
  /** When this entry was stored, as epoch milliseconds. */
  storedAt: number;
}

export interface TtlCache<T> {
  /** The entry if it is still inside the TTL, else `undefined`. */
  fresh(now?: number): CacheEntry<T> | undefined;
  /**
   * Whatever is stored, however old. This is the stale fallback: when Odoo is
   * unreachable, serving a six-hour-old snapshot clearly labelled as stale
   * beats serving an error page.
   */
  last(): CacheEntry<T> | undefined;
  put(value: T, now?: number): void;
  /**
   * Runs `load`, collapsing concurrent callers onto one in-flight promise. A
   * server-component render can fan out into several simultaneous requests;
   * without this a cold cache would fire a full set of Odoo calls for each.
   */
  loadOnce(load: () => Promise<T>): Promise<T>;
}

export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  let entry: CacheEntry<T> | undefined;
  let inFlight: Promise<T> | undefined;

  return {
    fresh(now = Date.now()) {
      if (!entry) return undefined;
      return now - entry.storedAt < ttlMs ? entry : undefined;
    },

    last() {
      return entry;
    },

    put(value, now = Date.now()) {
      entry = { storedAt: now, value };
    },

    loadOnce(load) {
      // A rejected load must not be cached and must not leave the slot stuck:
      // the next caller has to be able to retry.
      inFlight ??= load().finally(() => {
        inFlight = undefined;
      });
      return inFlight;
    },
  };
}

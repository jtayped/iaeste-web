/**
 * In-process, memory-only cooldown + rate limit for
 * `POST /v1/registrations/:id/resend-verification`. Per the plan: "there is
 * one API container and no traffic" — a `Map` is enough, no Redis needed.
 *
 * Keyed by registration id (not IP): the thing worth protecting here is a
 * single applicant's inbox from being spammed with verification emails
 * (whether by the applicant themselves double-clicking, or someone else who
 * guessed/observed their registration id), not "how many requests came from
 * one network address". An id-keyed limit also can't be trivially defeated
 * by rotating IPs, since the id is the one thing that has to stay constant
 * for the resend to do anything useful for an attacker.
 *
 * This map lives for the life of the process and is never pruned — with one
 * container and registration volumes in the hundreds/year, the memory cost
 * of one small object per registration id that ever asked for a resend is
 * negligible. A restart clears it, which only ever makes the limit more
 * permissive, never less.
 */

const COOLDOWN_MS = 60_000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;

interface Bucket {
  lastSentAt: number;
  sentAt: number[];
}

const buckets = new Map<string, Bucket>();

/** Whether a resend for `key` is currently allowed (cooldown + window both satisfied). */
export function canSend(key: string, now: number = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return true;

  if (now - bucket.lastSentAt < COOLDOWN_MS) return false;

  const recent = bucket.sentAt.filter((sentAt) => now - sentAt < WINDOW_MS);
  return recent.length < MAX_SENDS_PER_WINDOW;
}

/** Records that a resend for `key` was actually sent, for future `canSend` checks. */
export function recordSend(key: string, now: number = Date.now()): void {
  const bucket = buckets.get(key) ?? { lastSentAt: 0, sentAt: [] };
  bucket.lastSentAt = now;
  bucket.sentAt = [
    ...bucket.sentAt.filter((sentAt) => now - sentAt < WINDOW_MS),
    now,
  ];
  buckets.set(key, bucket);
}

/**
 * Generic fixed-window limiter for the public registration and invitation
 * endpoints, keyed by client IP. Same rationale as above: one API container,
 * a `Map` is enough, a restart only ever loosens the limit.
 *
 * The windows are deliberately long and wide rather than short and tight, and
 * that is the whole design. The people this protects against are spread over
 * time; the people it must not block arrive all at once. A lecture hall of
 * newcomers filling the form during a presentation shares a single NAT'd
 * university address, so sixty sign-ups land on one key inside a minute — a
 * per-minute ceiling low enough to be meaningful against abuse would reject
 * most of that room. A five-minute window sized for the room passes the burst
 * whole while still capping a sustained attacker, and the limits that actually
 * protect an inbox live elsewhere and are per-address, not per-IP: the
 * sixty-second resend cooldown and the five-sends-a-day ceiling above, plus
 * the per-challenge attempt counter behind the code check.
 */
const windows = new Map<string, number[]>();

export interface RateLimitVerdict {
  allowed: boolean;
  /**
   * Whole seconds until the oldest hit in the window falls out of it, i.e.
   * when a retry can succeed. Zero when the request was allowed. Surfaced to
   * the caller as `Retry-After` so a rejected client can say "try again in
   * twenty seconds" rather than presenting a dead end.
   */
  retryAfterSeconds: number;
}

export function checkRequest(
  key: string,
  maxPerWindow: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitVerdict {
  const hits = (windows.get(key) ?? []).filter((at) => now - at < windowMs);

  if (hits.length >= maxPerWindow) {
    windows.set(key, hits);
    const oldest = hits[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((windowMs - (now - oldest)) / 1000),
      ),
    };
  }

  hits.push(now);
  windows.set(key, hits);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** `checkRequest` for callers that only need the yes/no. */
export function allowRequest(
  key: string,
  maxPerWindow: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  return checkRequest(key, maxPerWindow, windowMs, now).allowed;
}

/**
 * Forgets one key's cooldown and window history.
 *
 * Used when a send the limiter has already accounted for turns out not to
 * have happened — a mail provider outage, say. Charging someone a
 * sixty-second cooldown for an email they never received is the limiter
 * punishing our failure rather than their behaviour.
 */
export function clearLimit(key: string): void {
  buckets.delete(key);
  windows.delete(key);
}

/** Test-only: drops every recorded send and window. */
export function resetLimits(): void {
  buckets.clear();
  windows.clear();
}

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
 * Generic fixed-window limiter for the invitation onboarding endpoints
 * (IA-32), keyed by client IP. Same rationale as above: one API container,
 * a `Map` is enough, a restart only ever loosens the limit.
 */
const windows = new Map<string, number[]>();

export function allowRequest(
  key: string,
  maxPerWindow: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const hits = (windows.get(key) ?? []).filter((at) => now - at < windowMs);
  if (hits.length >= maxPerWindow) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  return true;
}

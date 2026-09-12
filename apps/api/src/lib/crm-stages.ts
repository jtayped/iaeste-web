/**
 * The CRM stage ladder, and the date handling that goes with it.
 *
 * The ladder is declared here rather than read from `crm.stage.sequence`,
 * because in the `iaestelleida` database that column cannot order the stages:
 *
 * | id | name             | sequence | is_won | fold  |
 * |----|------------------|----------|--------|-------|
 * | 44 | Prospectes       | 0        | false  | false |
 * | 45 | Contactats       | 1        | false  | false |
 * | 54 | No interessats   | 1        | false  | false |
 * | 46 | Interessats      | 2        | false  | false |
 * | 48 | Negociant        | 3        | false  | false |
 * |  8 | Pràctica         | 4        | true   | false |
 * | 47 | No Interessats   | 5        | false  | false |
 *
 * "No interessats" (54) shares sequence 1 with "Contactats", and its
 * near-duplicate "No Interessats" (47) sits at sequence 5 — *after* the won
 * stage — so ordering by `sequence` puts a drop-out after a win. Neither
 * drop-out sets `fold`, so that flag cannot separate them either. Five ids
 * are cheaper to maintain than a heuristic that is wrong on the real data.
 *
 * If the stages are ever cleaned up in Odoo (merging 47 into 54, marking it
 * folded), update the two lists below — the name fallback keeps things
 * working in the meantime.
 */

/** Progression stages, in order. Anything else is a drop-out or unknown. */
export const LADDER_STAGE_IDS = [44, 45, 46, 48, 8] as const;

/** Terminal "they said no" stages, folded together for reporting. */
export const DROPOUT_STAGE_IDS = [54, 47] as const;

/** The won stage — a secured internship (`Pràctica`). */
export const WON_STAGE_ID = 8;

export type StageKind = "ladder" | "dropout" | "unclassified";

/**
 * Lowercase, strip accents and collapse whitespace. This is what folds
 * "No interessats" and "No Interessats" onto the same key.
 */
export function normaliseStageName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const DROPOUT_NAMES = new Set(["no interessats"]);
const LADDER_NAMES = new Map<string, number>([
  ["prospectes", 44],
  ["contactats", 45],
  ["interessats", 46],
  ["negociant", 48],
  ["practica", 8],
]);

/**
 * Classify by id first, then by normalised name, then give up.
 *
 * The name fallback matters because stages get deleted and re-created in the
 * Odoo UI, which changes the id. The `unclassified` result is deliberately
 * not an error: callers surface those stages in their own row rather than
 * dropping them, so the totals always add up and an unrecognised stage is
 * visible instead of silently missing.
 */
export function classifyStage(id: number, name: string): StageKind {
  if ((LADDER_STAGE_IDS as readonly number[]).includes(id)) return "ladder";
  if ((DROPOUT_STAGE_IDS as readonly number[]).includes(id)) return "dropout";

  const normalised = normaliseStageName(name);
  if (DROPOUT_NAMES.has(normalised)) return "dropout";
  // Guard against a re-created stage colliding with a ladder id we already
  // matched above — only treat the name as a ladder hit for an unknown id.
  if (LADDER_NAMES.has(normalised)) return "ladder";

  return "unclassified";
}

/** Position on the ladder, or -1. Used to order and to cumulate the funnel. */
export function ladderIndex(id: number, name: string): number {
  const byId = (LADDER_STAGE_IDS as readonly number[]).indexOf(id);
  if (byId !== -1) return byId;

  const byName = LADDER_NAMES.get(normaliseStageName(name));
  return byName === undefined
    ? -1
    : (LADDER_STAGE_IDS as readonly number[]).indexOf(byName);
}

/**
 * Odoo serialises datetimes as naive UTC — `"2026-03-19 15:10:47"`, with no
 * zone suffix. `new Date()` parses that as **local** time, which on a
 * Europe/Madrid box is an hour off in winter and two in summer, enough to
 * move a timestamp across a day boundary and quietly shift every
 * "days since" figure by one. Always parse through here.
 */
export function parseOdooDatetime(value: string): Date | null {
  const date = new Date(`${value.trim().replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const MS_PER_DAY = 86_400_000;

/** Whole days between `value` and `now`, floored. Negative clamps to 0. */
export function daysSince(value: Date, now: number): number {
  return Math.max(0, Math.floor((now - value.getTime()) / MS_PER_DAY));
}

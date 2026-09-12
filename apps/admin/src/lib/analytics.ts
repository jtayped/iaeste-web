import type { components } from "@repo/api-client";

/** Response shape of `GET /v1/admin/analytics/crm`, from the generated client. */
export type CrmAnalytics = components["schemas"]["CrmAnalytics"];
export type CrmActivity = CrmAnalytics["activity"];
export type CrmTotals = CrmAnalytics["totals"];
export type CrmStaleBuckets = CrmAnalytics["staleBuckets"];
export type CrmFunnelStep = components["schemas"]["CrmFunnelStep"];
export type CrmOwnerRow = components["schemas"]["CrmOwnerRow"];
export type CrmColdLead = components["schemas"]["CrmColdLead"];

/**
 * `forbidden` mirrors `OverviewResult`: 401 and 403 both mean this browser has
 * no business here. `unavailable` is its own case because a 503 with
 * `UPSTREAM_UNAVAILABLE` is *Odoo* being unreachable or unconfigured, not our
 * API failing — the two need different copy and different next steps, and
 * collapsing them into `error` is what makes an outage take an hour to place.
 */
export type CrmAnalyticsResult =
  | { status: "ok"; analytics: CrmAnalytics }
  | { status: "forbidden" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

/**
 * Above this many days without a single touch, the CRM is not "quiet", it is
 * stopped, and the page says so before showing a number. Two months is past
 * any plausible exam period or summer gap.
 */
export const DORMANT_AFTER_DAYS = 60;

export function isDormant(days: number | null): days is number {
  return days !== null && days > DORMANT_AFTER_DAYS;
}

/** `part / total`, or `null` when the share would be meaningless. */
export function shareOf(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total)) return null;
  if (total <= 0) return null;
  return part / total;
}

/**
 * `0.198` → `19,8%`. Hand-rolled rather than `Intl.NumberFormat` for the same
 * reason as `format.ts`: a server and a browser can resolve different locales
 * and React reports the difference as a hydration mismatch. Catalan writes the
 * decimal separator as a comma.
 */
export function formatPercent(
  ratio: number | null | undefined,
  decimals = 0,
): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return "—";
  }
  return `${(ratio * 100).toFixed(decimals).replace(".", ",")}%`;
}

/** `1149` → `1.149`. Catalan groups thousands with a full stop. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const negative = value < 0;
  const digits = Math.abs(Math.trunc(value)).toString();
  let grouped = "";
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i;
    if (i > 0 && fromEnd % 3 === 0) grouped += ".";
    grouped += digits[i];
  }
  return negative ? `-${grouped}` : grouped;
}

/** `176` → `176 dies`; `1` → `1 dia`; `null` → `—`. */
export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined || !Number.isFinite(days)) return "—";
  const rounded = Math.round(days);
  return rounded === 1 ? "1 dia" : `${formatCount(rounded)} dies`;
}

/**
 * The same span in the unit a person actually thinks in: `176` → `uns 6
 * mesos`. Used beside the exact day count, never instead of it — the round
 * number is what makes six months land, the exact one is what makes it
 * checkable.
 */
export function describeElapsed(days: number): string {
  const rounded = Math.max(0, Math.round(days));
  if (rounded < 45) return rounded === 1 ? "un dia" : `${rounded} dies`;
  if (rounded < 365) {
    const months = Math.round(rounded / 30);
    return months === 1 ? "un mes" : `uns ${months} mesos`;
  }
  // Floored and qualified, never rounded: 553 days is a year and a half, and
  // calling that "uns 2 anys" would overstate the only number on the page
  // nobody can check against a date.
  const years = Math.floor(rounded / 365);
  return years === 1 ? "més d'un any" : `més de ${years} anys`;
}

/**
 * Bar widths for the funnel and the staleness buckets.
 *
 * The floor matters more than the arithmetic here: this pipeline runs
 * 1.149 → 228 → 23 → 13 → 4, so three of the five steps are under 2% of the
 * first and would render as an invisible sliver — indistinguishable from the
 * zero buckets right next to them. A non-zero value always draws something.
 * Zero draws nothing at all, which is the one case that must read as empty.
 */
export const MIN_BAR_PERCENT = 1.5;

export function barWidthPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max)) return 0;
  if (value <= 0 || max <= 0) return 0;
  const percent = (value / max) * 100;
  return Math.min(
    100,
    Math.max(MIN_BAR_PERCENT, Math.round(percent * 10) / 10),
  );
}

/** Severity of a staleness bucket. Drives an icon and a label, never colour alone. */
export type StaleTone = "ok" | "warn" | "alert" | "danger";

export interface StaleBucketRow {
  key: keyof CrmStaleBuckets;
  label: string;
  count: number;
  tone: StaleTone;
}

/** Fresh first, worst last, so the bars read as one axis of elapsed time. */
export function staleBucketRows(buckets: CrmStaleBuckets): StaleBucketRow[] {
  return [
    { key: "upTo6", label: "fins a 6 dies", count: buckets.upTo6, tone: "ok" },
    {
      key: "from7To29",
      label: "de 7 a 29 dies",
      count: buckets.from7To29,
      tone: "warn",
    },
    {
      key: "from30To89",
      label: "de 30 a 89 dies",
      count: buckets.from30To89,
      tone: "alert",
    },
    {
      key: "from90",
      label: "90 dies o més",
      count: buckets.from90,
      tone: "danger",
    },
  ];
}

/**
 * Pairs an owner's `byStage` counts with the ladder names from `funnel`.
 *
 * The two arrays are produced independently by the API and are only expected
 * to line up; zipping them blind would silently mislabel every column if the
 * ladder ever gained a stage. Anything unpaired on either side is dropped.
 */
export function alignOwnerStages(
  byStage: readonly number[],
  funnel: readonly { name: string }[],
): { name: string; count: number }[] {
  const length = Math.min(byStage.length, funnel.length);
  const rows: { name: string; count: number }[] = [];
  for (let i = 0; i < length; i += 1) {
    rows.push({ name: funnel[i]!.name, count: byStage[i] ?? 0 });
  }
  return rows;
}

/**
 * The pool of leads nobody has taken yet.
 *
 * Unclaimed is not neglect here: this is a student association, members take
 * on what they have capacity for, and nobody can be assigned work in advance.
 * The pool is the queue working as designed, so the count on its own says
 * nothing — what says something is how long the queue has been waiting, which
 * is why the ages come out alongside it and lead the display.
 *
 * The ages come from the owners row keyed by a null `ownerId` (the API leaves
 * the name null there and lets the UI label it). The count comes from `totals`,
 * which is the authoritative figure; when there is no unassigned row at all
 * the ages are simply unknown and the caller falls back to the count.
 */
export interface UnclaimedQueue {
  count: number;
  /** The pipeline the queue is a part of, so the bar has a track to fill. */
  openLeads: number;
  /** Share of the open pipeline that is available to pick up. */
  share: number | null;
  medianDays: number | null;
  oldestDays: number | null;
}

export function unclaimedQueue(
  owners: readonly CrmOwnerRow[],
  totals: CrmTotals,
): UnclaimedQueue {
  const row = owners.find((owner) => owner.ownerId === null);
  return {
    count: totals.unassignedLeads,
    openLeads: totals.openLeads,
    share: shareOf(totals.unassignedLeads, totals.openLeads),
    medianDays: row?.medianTouchDays ?? null,
    oldestDays: row?.oldestTouchDays ?? null,
  };
}

/**
 * Whether the oldest wait is worth printing next to the median. When the two
 * are the same — which is what a fully stalled queue looks like — the second
 * figure is the first one again and only costs the reader a glance.
 */
export function showsOldestBesideMedian(queue: UnclaimedQueue): boolean {
  return (
    queue.medianDays !== null &&
    queue.oldestDays !== null &&
    queue.oldestDays > queue.medianDays
  );
}

/** The unassigned bucket comes back as a null owner on some rows and a name on others. */
export function ownerLabel(ownerName: string | null): string {
  const trimmed = ownerName?.trim();
  return trimmed ? trimmed : "sense propietari";
}

/**
 * The company line under a cold lead's name, or `null` when there is nothing
 * to add. Odoo stores the company as the lead name on most of these rows, so
 * printing both verbatim renders the same string twice and makes the table
 * look broken.
 */
export function leadSubtitle(
  name: string,
  company: string | null,
): string | null {
  const trimmed = company?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase() === name.trim().toLowerCase() ? null : trimmed;
}

/**
 * Deep link to one lead in Odoo. `/odoo/<action>/<id>` is the URL scheme of
 * the SaaS instance we point at; the base is the shared `ODOO_URL` constant so
 * this module never grows an origin of its own.
 */
export function odooLeadUrl(base: string, id: number): string {
  return `${base.replace(/\/+$/, "")}/odoo/crm/${id}`;
}

/**
 * What the activity block should say.
 *
 * The counters are `0` and `0` right now, and a tile reading "activitat: 0" is
 * the exact failure this returns a shape to prevent: a bare zero reads as a
 * broken query, while "fa 176 dies, des del 19 de març" reads as a fact about
 * the business. So when nothing has been touched in either window, the block
 * leads with elapsed time and drops the counters entirely; the moment somebody
 * touches a lead, the counters become the more informative thing and come back.
 */
export interface ActivitySummary {
  /** `elapsed` hides the two zero counters; `counters` shows them. */
  mode: "elapsed" | "counters" | "unknown";
  days: number | null;
  dormant: boolean;
}

export function summariseActivity(activity: CrmActivity): ActivitySummary {
  const days = activity.daysSinceLastActivity;
  const dormant = isDormant(days);
  if (days === null) return { mode: "unknown", days: null, dormant: false };
  const silent =
    activity.touchedLast7Days === 0 && activity.touchedLast30Days === 0;
  return { mode: silent ? "elapsed" : "counters", days, dormant };
}

import {
  classifyStage,
  daysSince,
  LADDER_STAGE_IDS,
  ladderIndex,
  parseOdooDatetime,
  WON_STAGE_ID,
} from "./crm-stages";
import { many2oneId, many2oneLabel, type OdooGroupRow } from "./odoo";

/**
 * Turns raw Odoo rows into the analytics response body. Pure: no I/O, no
 * clock of its own, no Odoo client — `now` is a parameter so every figure
 * here is reproducible in a test.
 *
 * Two scopes run through this file and must never be mixed silently:
 *
 * - **Retrospective** (funnel, stage totals, won) covers *all* leads,
 *   archived included. 892 of 1,149 leads on this database are archived, so
 *   a funnel over active leads alone would describe under a quarter of the
 *   history.
 * - **Operational** (owners, stale buckets, cold list) covers *active* leads
 *   on a ladder stage only. You cannot follow up an archived lead, and
 *   putting one in a follow-up queue makes the queue useless.
 *
 * Every field below says which scope it belongs to.
 */

/** `crm.stage` row. */
export interface OdooStageRow {
  id: number;
  name: string;
}

/** `crm.lead` row from the active-lead read. */
export interface OdooLeadRow {
  id: number;
  name?: string | false;
  partner_name?: string | false;
  stage_id?: unknown;
  user_id?: unknown;
  write_date?: string | false;
}

/** `crm.lead` row from the won read (all leads, archived included). */
export interface OdooWonLeadRow {
  id: number;
  day_close?: number | false;
}

export interface CrmAnalyticsInput {
  stages: OdooStageRow[];
  /** Active leads. Capped at `activeLimit`; see `truncated`. */
  activeLeads: OdooLeadRow[];
  activeLimit: number;
  /** `formatted_read_group` on `stage_id` over all leads, archived included. */
  stageTotals: OdooGroupRow[];
  wonLeads: OdooWonLeadRow[];
}

export interface StageBucket {
  stageId: number;
  name: string;
  /** Operational scope. */
  active: number;
  /** Retrospective scope, derived as total − active. */
  archived: number;
  total: number;
}

export interface FunnelStep {
  stageId: number;
  name: string;
  /**
   * Leads whose *current* stage is this one or further along, across active
   * and archived. An approximation: `mail.tracking.value` is not readable
   * with this API key, so there is no stage-transition history and a lead
   * that advanced then moved back reads as never having advanced.
   */
  reached: number;
  /**
   * `reached / previous.reached`, or null when the previous step holds fewer
   * than `MIN_RATE_SAMPLE` leads — below that the ratio is noise.
   */
  stepRate: number | null;
}

export interface OwnerRow {
  /** null for leads with no salesperson. */
  ownerId: number | null;
  /** null when unassigned; the UI supplies the label. */
  ownerName: string | null;
  openLeads: number;
  staleLeads: number;
  oldestTouchDays: number | null;
  medianTouchDays: number | null;
  /** Open-lead counts per ladder stage, in ladder order. */
  byStage: number[];
}

export interface ColdLead {
  id: number;
  name: string;
  company: string | null;
  stageName: string;
  ownerName: string | null;
  daysSinceTouch: number;
}

export interface CrmAnalytics {
  fetchedAt: string;
  stale: boolean;
  truncated: boolean;
  activity: {
    lastActivityAt: string | null;
    daysSinceLastActivity: number | null;
    touchedLast7Days: number;
    touchedLast30Days: number;
  };
  totals: {
    allLeads: number;
    activeLeads: number;
    archivedLeads: number;
    wonLeads: number;
    droppedLeads: number;
    openLeads: number;
    unassignedLeads: number;
    staleLeads: number;
  };
  stages: StageBucket[];
  funnel: FunnelStep[];
  unclassifiedStages: StageBucket[];
  staleBuckets: {
    upTo6: number;
    from7To29: number;
    from30To89: number;
    from90: number;
  };
  owners: OwnerRow[];
  coldLeads: ColdLead[];
  won: { count: number; medianDaysToClose: number | null; sampleSize: number };
}

/** A lead untouched for this long is a follow-up the committee owes. */
export const STALE_AFTER_DAYS = 30;

/**
 * Below this many leads, a step-to-step conversion rate is noise and is
 * reported as null rather than as a number nobody should act on.
 */
export const MIN_RATE_SAMPLE = 20;

const COLD_LEAD_LIMIT = 12;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function groupCount(row: OdooGroupRow): number {
  const value = row.__count;
  return typeof value === "number" ? value : 0;
}

export function buildCrmAnalytics(
  input: CrmAnalyticsInput,
  now: number,
): CrmAnalytics {
  const stageNames = new Map(input.stages.map((s) => [s.id, s.name]));

  // --- Retrospective: per-stage totals over every lead -------------------
  const totalByStage = new Map<number, number>();
  for (const row of input.stageTotals) {
    const id = many2oneId(row.stage_id);
    if (id === null) continue;
    totalByStage.set(id, (totalByStage.get(id) ?? 0) + groupCount(row));
    if (!stageNames.has(id)) {
      stageNames.set(id, many2oneLabel(row.stage_id) ?? `#${id}`);
    }
  }

  // --- Operational: the active leads, classified once --------------------
  interface Lead {
    row: OdooLeadRow;
    stageId: number;
    stageName: string;
    ladderAt: number;
    ownerId: number | null;
    ownerName: string | null;
    daysSinceTouch: number | null;
  }

  const activeByStage = new Map<number, number>();
  const leads: Lead[] = [];
  for (const row of input.activeLeads) {
    const stageId = many2oneId(row.stage_id);
    if (stageId === null) continue;
    activeByStage.set(stageId, (activeByStage.get(stageId) ?? 0) + 1);

    const stageName =
      stageNames.get(stageId) ?? many2oneLabel(row.stage_id) ?? `#${stageId}`;
    const touched =
      typeof row.write_date === "string"
        ? parseOdooDatetime(row.write_date)
        : null;

    leads.push({
      daysSinceTouch: touched === null ? null : daysSince(touched, now),
      ladderAt: ladderIndex(stageId, stageName),
      ownerId: many2oneId(row.user_id),
      ownerName: many2oneLabel(row.user_id),
      row,
      stageId,
      stageName,
    });
  }

  // --- Stage buckets, and the unclassified ones surfaced separately ------
  const buckets: StageBucket[] = [];
  const unclassified: StageBucket[] = [];
  const seen = new Set<number>([
    ...totalByStage.keys(),
    ...activeByStage.keys(),
  ]);
  for (const stageId of seen) {
    const name = stageNames.get(stageId) ?? `#${stageId}`;
    const active = activeByStage.get(stageId) ?? 0;
    const total = totalByStage.get(stageId) ?? active;
    const bucket: StageBucket = {
      active,
      // Never let a rounding or scope mismatch produce a negative count.
      archived: Math.max(0, total - active),
      name,
      stageId,
      total,
    };
    (classifyStage(stageId, name) === "unclassified"
      ? unclassified
      : buckets
    ).push(bucket);
  }
  buckets.sort(
    (a, b) =>
      ladderIndex(a.stageId, a.name) - ladderIndex(b.stageId, b.name) ||
      a.stageId - b.stageId,
  );

  const allLeads = [...totalByStage.values()].reduce((a, b) => a + b, 0);

  // --- Funnel: cumulative from the ladder, over all leads ----------------
  const funnel: FunnelStep[] = LADDER_STAGE_IDS.map((stageId, index) => {
    const name = stageNames.get(stageId) ?? `#${stageId}`;
    // Everything that ever entered the pipeline counts as having reached the
    // first step, drop-outs included; later steps cumulate the ladder only.
    const reached =
      index === 0
        ? allLeads
        : buckets
            .filter((b) => {
              const at = ladderIndex(b.stageId, b.name);
              return at !== -1 && at >= index;
            })
            .reduce((sum, b) => sum + b.total, 0);
    return { name, reached, stageId, stepRate: null as number | null };
  });
  for (let i = 1; i < funnel.length; i += 1) {
    const previous = funnel[i - 1]!.reached;
    funnel[i]!.stepRate =
      previous >= MIN_RATE_SAMPLE ? funnel[i]!.reached / previous : null;
  }

  // --- Operational aggregates over open leads ----------------------------
  // Open = active, on the ladder, not yet won. Drop-outs and unclassified
  // stages are excluded: they are not follow-ups anybody owes.
  const open = leads.filter(
    (lead) => lead.ladderAt !== -1 && lead.stageId !== WON_STAGE_ID,
  );

  const staleBuckets = { from7To29: 0, from30To89: 0, from90: 0, upTo6: 0 };
  for (const lead of open) {
    const days = lead.daysSinceTouch;
    if (days === null) continue;
    if (days >= 90) staleBuckets.from90 += 1;
    else if (days >= STALE_AFTER_DAYS) staleBuckets.from30To89 += 1;
    else if (days >= 7) staleBuckets.from7To29 += 1;
    else staleBuckets.upTo6 += 1;
  }

  const ownerKey = (lead: Lead) => lead.ownerId ?? "unassigned";
  const ownerGroups = new Map<number | string, Lead[]>();
  for (const lead of open) {
    const key = ownerKey(lead);
    const group = ownerGroups.get(key);
    if (group) group.push(lead);
    else ownerGroups.set(key, [lead]);
  }

  const owners: OwnerRow[] = [...ownerGroups.values()].map((group) => {
    const touchDays = group
      .map((lead) => lead.daysSinceTouch)
      .filter((days): days is number => days !== null);
    const byStage = LADDER_STAGE_IDS.map(
      (_, index) => group.filter((lead) => lead.ladderAt === index).length,
    );
    return {
      byStage,
      medianTouchDays: median(touchDays),
      oldestTouchDays: touchDays.length ? Math.max(...touchDays) : null,
      openLeads: group.length,
      ownerId: group[0]!.ownerId,
      ownerName: group[0]!.ownerName,
      staleLeads: touchDays.filter((days) => days >= STALE_AFTER_DAYS).length,
    };
  });
  // Most follow-ups owed first — this ordering *is* the answer to "who owes
  // what", so the top row should be where attention goes.
  owners.sort(
    (a, b) =>
      b.staleLeads - a.staleLeads ||
      (b.oldestTouchDays ?? -1) - (a.oldestTouchDays ?? -1) ||
      b.openLeads - a.openLeads,
  );

  const coldLeads: ColdLead[] = open
    .filter(
      (lead): lead is Lead & { daysSinceTouch: number } =>
        lead.daysSinceTouch !== null && lead.daysSinceTouch >= STALE_AFTER_DAYS,
    )
    .sort((a, b) => b.daysSinceTouch - a.daysSinceTouch)
    .slice(0, COLD_LEAD_LIMIT)
    .map((lead) => ({
      company:
        typeof lead.row.partner_name === "string"
          ? lead.row.partner_name
          : null,
      daysSinceTouch: lead.daysSinceTouch,
      id: lead.row.id,
      name:
        typeof lead.row.name === "string" ? lead.row.name : `#${lead.row.id}`,
      ownerName: lead.ownerName,
      stageName: lead.stageName,
    }));

  // --- Activity -----------------------------------------------------------
  const touchTimes = leads
    .map((lead) =>
      typeof lead.row.write_date === "string"
        ? parseOdooDatetime(lead.row.write_date)
        : null,
    )
    .filter((date): date is Date => date !== null)
    .map((date) => date.getTime());
  const lastActivity = touchTimes.length ? Math.max(...touchTimes) : null;

  const wonDays = input.wonLeads
    .map((lead) => lead.day_close)
    .filter((days): days is number => typeof days === "number" && days > 0);

  const droppedLeads = buckets
    .filter((b) => classifyStage(b.stageId, b.name) === "dropout")
    .reduce((sum, b) => sum + b.total, 0);

  return {
    activity: {
      daysSinceLastActivity:
        lastActivity === null ? null : daysSince(new Date(lastActivity), now),
      lastActivityAt:
        lastActivity === null ? null : new Date(lastActivity).toISOString(),
      touchedLast30Days: open.filter(
        (lead) => lead.daysSinceTouch !== null && lead.daysSinceTouch < 30,
      ).length,
      touchedLast7Days: open.filter(
        (lead) => lead.daysSinceTouch !== null && lead.daysSinceTouch < 7,
      ).length,
    },
    coldLeads,
    fetchedAt: new Date(now).toISOString(),
    funnel,
    owners,
    stages: buckets,
    stale: false,
    staleBuckets,
    totals: {
      activeLeads: leads.length,
      allLeads,
      archivedLeads: Math.max(0, allLeads - leads.length),
      droppedLeads,
      openLeads: open.length,
      staleLeads: open.filter(
        (lead) =>
          lead.daysSinceTouch !== null &&
          lead.daysSinceTouch >= STALE_AFTER_DAYS,
      ).length,
      unassignedLeads: open.filter((lead) => lead.ownerId === null).length,
      wonLeads: totalByStage.get(WON_STAGE_ID) ?? 0,
    },
    truncated: input.activeLeads.length >= input.activeLimit,
    unclassifiedStages: unclassified,
    won: {
      count: totalByStage.get(WON_STAGE_ID) ?? 0,
      medianDaysToClose: median(wonDays),
      sampleSize: wonDays.length,
    },
  };
}

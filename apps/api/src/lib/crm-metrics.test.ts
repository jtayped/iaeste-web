import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCrmAnalytics,
  MIN_RATE_SAMPLE,
  STALE_AFTER_DAYS,
  type CrmAnalyticsInput,
  type OdooLeadRow,
} from "./crm-metrics";

const NOW = Date.UTC(2026, 8, 12); // 2026-09-12

/** The real stage list from `iaestelleida`, duplicate drop-out included. */
const STAGES = [
  { id: 44, name: "Prospectes" },
  { id: 45, name: "Contactats" },
  { id: 54, name: "No interessats" },
  { id: 46, name: "Interessats" },
  { id: 48, name: "Negociant" },
  { id: 8, name: "Pràctica" },
  { id: 47, name: "No Interessats" },
];

/** Production per-stage totals across all 1,149 leads. */
const STAGE_TOTALS = [
  { __count: 864, stage_id: [44, "Prospectes"] },
  { __count: 205, stage_id: [45, "Contactats"] },
  { __count: 19, stage_id: [54, "No interessats"] },
  { __count: 10, stage_id: [46, "Interessats"] },
  { __count: 9, stage_id: [48, "Negociant"] },
  { __count: 4, stage_id: [8, "Pràctica"] },
  { __count: 38, stage_id: [47, "No Interessats"] },
];

function daysAgo(days: number): string {
  const date = new Date(NOW - days * 86_400_000);
  // Odoo's naive-UTC serialisation: no zone suffix, space separator.
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function lead(
  id: number,
  stage: [number, string],
  owner: [number, string] | false,
  touchedDaysAgo: number,
  extra: Partial<OdooLeadRow> = {},
): OdooLeadRow {
  return {
    id,
    name: `lead ${id}`,
    stage_id: stage,
    user_id: owner,
    write_date: daysAgo(touchedDaysAgo),
    ...extra,
  };
}

function input(overrides: Partial<CrmAnalyticsInput> = {}): CrmAnalyticsInput {
  return {
    activeLeads: [],
    activeLimit: 1000,
    stages: STAGES,
    stageTotals: STAGE_TOTALS,
    wonLeads: [],
    ...overrides,
  };
}

describe("funnel", () => {
  it("cumulates the ladder over every lead, archived included", () => {
    const result = buildCrmAnalytics(input(), NOW);

    assert.deepEqual(
      result.funnel.map((step) => [step.name, step.reached]),
      [
        ["Prospectes", 1149],
        ["Contactats", 228],
        ["Interessats", 23],
        ["Negociant", 13],
        ["Pràctica", 4],
      ],
    );
  });

  it("counts drop-outs as having reached the first step only", () => {
    // 57 dropped leads entered the pipeline, so they belong in Prospectes;
    // they never reached Contactats.
    const result = buildCrmAnalytics(input(), NOW);

    assert.equal(result.funnel[0]!.reached, 1149);
    assert.equal(result.totals.droppedLeads, 19 + 38);
    assert.equal(result.funnel[1]!.reached, 205 + 10 + 9 + 4);
  });

  it("suppresses a step rate computed from too small a base", () => {
    const result = buildCrmAnalytics(input(), NOW);

    // Prospectes is the base, so it has no rate of its own.
    assert.equal(result.funnel[0]!.stepRate, null);
    // 228 and 23 are both at or above the floor.
    assert.ok(result.funnel[1]!.stepRate! > 0);
    assert.ok(result.funnel[2]!.stepRate! > 0);
    // Negociant's base is 23 — still fine. Pràctica's base is 13 — noise.
    assert.ok(result.funnel[3]!.stepRate! > 0);
    assert.equal(result.funnel[4]!.stepRate, null);
    assert.ok(MIN_RATE_SAMPLE > 13);
  });
});

describe("stage buckets", () => {
  it("derives archived as total minus active and never goes negative", () => {
    const result = buildCrmAnalytics(
      input({
        activeLeads: [
          lead(1, [44, "Prospectes"], false, 1),
          lead(2, [44, "Prospectes"], false, 1),
        ],
      }),
      NOW,
    );

    const prospectes = result.stages.find((s) => s.stageId === 44)!;
    assert.equal(prospectes.total, 864);
    assert.equal(prospectes.active, 2);
    assert.equal(prospectes.archived, 862);
    assert.ok(result.stages.every((s) => s.archived >= 0));
  });

  it("surfaces an unrecognised stage instead of dropping it", () => {
    const result = buildCrmAnalytics(
      input({
        stageTotals: [
          ...STAGE_TOTALS,
          { __count: 5, stage_id: [99, "Pendent de resposta"] },
        ],
      }),
      NOW,
    );

    assert.deepEqual(
      result.unclassifiedStages.map((s) => [s.name, s.total]),
      [["Pendent de resposta", 5]],
    );
    // The total still accounts for it — nothing silently vanishes.
    assert.equal(result.totals.allLeads, 1154);
  });

  it("orders buckets by the ladder, not by Odoo's sequence column", () => {
    const result = buildCrmAnalytics(input(), NOW);
    const ladder = result.stages
      .filter((s) => [44, 45, 46, 48, 8].includes(s.stageId))
      .map((s) => s.name);

    assert.deepEqual(ladder, [
      "Prospectes",
      "Contactats",
      "Interessats",
      "Negociant",
      "Pràctica",
    ]);
  });
});

describe("operational scope", () => {
  it("counts a lead stale at exactly the threshold, not a day later", () => {
    const result = buildCrmAnalytics(
      input({
        activeLeads: [
          lead(1, [45, "Contactats"], false, STALE_AFTER_DAYS - 1),
          lead(2, [45, "Contactats"], false, STALE_AFTER_DAYS),
        ],
      }),
      NOW,
    );

    assert.equal(result.totals.staleLeads, 1);
    assert.equal(result.staleBuckets.from7To29, 1);
    assert.equal(result.staleBuckets.from30To89, 1);
  });

  it("excludes won and dropped leads from the open follow-up queue", () => {
    const result = buildCrmAnalytics(
      input({
        activeLeads: [
          lead(1, [45, "Contactats"], false, 200),
          lead(2, [8, "Pràctica"], false, 200),
          lead(3, [54, "No interessats"], false, 200),
          lead(4, [47, "No Interessats"], false, 200),
        ],
      }),
      NOW,
    );

    assert.equal(result.totals.activeLeads, 4);
    assert.equal(result.totals.openLeads, 1);
    assert.equal(result.coldLeads.length, 1);
  });

  it("buckets open leads by how long they have been untouched", () => {
    const result = buildCrmAnalytics(
      input({
        activeLeads: [
          lead(1, [44, "Prospectes"], false, 0),
          lead(2, [44, "Prospectes"], false, 6),
          lead(3, [44, "Prospectes"], false, 7),
          lead(4, [44, "Prospectes"], false, 29),
          lead(5, [44, "Prospectes"], false, 30),
          lead(6, [44, "Prospectes"], false, 89),
          lead(7, [44, "Prospectes"], false, 90),
          lead(8, [44, "Prospectes"], false, 176),
        ],
      }),
      NOW,
    );

    assert.deepEqual(result.staleBuckets, {
      from30To89: 2,
      from7To29: 2,
      from90: 2,
      upTo6: 2,
    });
  });
});

describe("owners", () => {
  const activeLeads = [
    lead(1, [44, "Prospectes"], false, 275),
    lead(2, [45, "Contactats"], false, 275),
    lead(3, [44, "Prospectes"], [39, "Manel Ibars Roma"], 192),
    lead(4, [46, "Interessats"], [39, "Manel Ibars Roma"], 100),
    lead(5, [44, "Prospectes"], [15, "Joel Taylor Pedrós"], 2),
  ];

  it("gives unassigned leads their own row with a null owner", () => {
    const result = buildCrmAnalytics(input({ activeLeads }), NOW);
    const unassigned = result.owners.find((row) => row.ownerId === null)!;

    assert.equal(unassigned.ownerName, null);
    assert.equal(unassigned.openLeads, 2);
    assert.equal(result.totals.unassignedLeads, 2);
  });

  it("sorts by follow-ups owed, so the top row is where attention goes", () => {
    const result = buildCrmAnalytics(input({ activeLeads }), NOW);

    assert.deepEqual(
      result.owners.map((row) => [row.ownerName, row.staleLeads]),
      [
        [null, 2],
        ["Manel Ibars Roma", 2],
        ["Joel Taylor Pedrós", 0],
      ],
    );
    // The unassigned pile and Manel both owe 2; the older one wins the tie.
    assert.ok(
      result.owners[0]!.oldestTouchDays! > result.owners[1]!.oldestTouchDays!,
    );
  });

  it("reports each owner's spread across the ladder", () => {
    const result = buildCrmAnalytics(input({ activeLeads }), NOW);
    const manel = result.owners.find((row) => row.ownerId === 39)!;

    // [Prospectes, Contactats, Interessats, Negociant, Pràctica]
    assert.deepEqual(manel.byStage, [1, 0, 1, 0, 0]);
    assert.equal(manel.medianTouchDays, 146);
  });
});

describe("cold leads", () => {
  it("lists the coldest first and only those past the threshold", () => {
    const result = buildCrmAnalytics(
      input({
        activeLeads: [
          lead(1, [44, "Prospectes"], false, 10),
          lead(2, [44, "Prospectes"], false, 300, { partner_name: "Samca" }),
          lead(3, [44, "Prospectes"], false, 100),
        ],
      }),
      NOW,
    );

    assert.deepEqual(
      result.coldLeads.map((l) => [l.id, l.daysSinceTouch]),
      [
        [2, 300],
        [3, 100],
      ],
    );
    assert.equal(result.coldLeads[0]!.company, "Samca");
    assert.equal(result.coldLeads[1]!.company, null);
  });

  it("caps the list so the panel stays readable", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      lead(i + 1, [44, "Prospectes"], false, 100 + i),
    );
    const result = buildCrmAnalytics(input({ activeLeads: many }), NOW);

    assert.equal(result.coldLeads.length, 12);
    assert.equal(result.coldLeads[0]!.daysSinceTouch, 139);
  });
});

describe("activity and won", () => {
  it("reports the most recent touch across all active leads", () => {
    const result = buildCrmAnalytics(
      input({
        activeLeads: [
          lead(1, [44, "Prospectes"], false, 300),
          lead(2, [44, "Prospectes"], false, 176),
        ],
      }),
      NOW,
    );

    assert.equal(result.activity.daysSinceLastActivity, 176);
    assert.equal(result.activity.touchedLast7Days, 0);
    assert.equal(result.activity.touchedLast30Days, 0);
  });

  it("takes the median of an even-sized won sample and reports n", () => {
    // The real four: 15, 48, 314, 319 days.
    const result = buildCrmAnalytics(
      input({
        wonLeads: [
          { day_close: 15, id: 1 },
          { day_close: 48, id: 2 },
          { day_close: 314, id: 3 },
          { day_close: 319, id: 4 },
        ],
      }),
      NOW,
    );

    assert.equal(result.won.medianDaysToClose, 181);
    assert.equal(result.won.sampleSize, 4);
    assert.equal(result.won.count, 4);
  });

  it("has no median when nothing has been won", () => {
    const result = buildCrmAnalytics(input({ wonLeads: [] }), NOW);

    assert.equal(result.won.medianDaysToClose, null);
    assert.equal(result.won.sampleSize, 0);
  });
});

describe("edge cases", () => {
  it("flags truncation when the active read hit its limit", () => {
    const capped = Array.from({ length: 5 }, (_, i) =>
      lead(i + 1, [44, "Prospectes"], false, 1),
    );

    assert.equal(
      buildCrmAnalytics(input({ activeLeads: capped, activeLimit: 5 }), NOW)
        .truncated,
      true,
    );
    assert.equal(
      buildCrmAnalytics(input({ activeLeads: capped, activeLimit: 6 }), NOW)
        .truncated,
      false,
    );
  });

  it("survives a completely empty CRM without throwing", () => {
    const result = buildCrmAnalytics(
      {
        activeLeads: [],
        activeLimit: 100,
        stages: [],
        stageTotals: [],
        wonLeads: [],
      },
      NOW,
    );

    assert.equal(result.totals.allLeads, 0);
    assert.equal(result.activity.lastActivityAt, null);
    assert.equal(result.owners.length, 0);
    assert.equal(result.funnel.length, 5);
    assert.ok(result.funnel.every((step) => step.reached === 0));
  });

  it("ignores a lead with no stage rather than miscounting it", () => {
    const result = buildCrmAnalytics(
      input({
        activeLeads: [
          lead(1, [44, "Prospectes"], false, 1),
          { id: 2, stage_id: false, write_date: daysAgo(1) },
        ],
      }),
      NOW,
    );

    assert.equal(result.totals.activeLeads, 1);
  });
});

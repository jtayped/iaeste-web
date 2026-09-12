import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  alignOwnerStages,
  barWidthPercent,
  describeElapsed,
  formatCount,
  formatDays,
  formatPercent,
  isDormant,
  leadSubtitle,
  MIN_BAR_PERCENT,
  odooLeadUrl,
  ownerLabel,
  shareOf,
  showsOldestBesideMedian,
  staleBucketRows,
  summariseActivity,
  unclaimedQueue,
} from "./analytics";

describe("shares and percentages", () => {
  it("computes the unclaimed share of the open pipeline", () => {
    assert.equal(formatPercent(shareOf(144, 232)), "62%");
  });

  it("renders a step rate to one decimal with a Catalan comma", () => {
    assert.equal(formatPercent(228 / 1149, 1), "19,8%");
    assert.equal(formatPercent(13 / 23, 1), "56,5%");
  });

  it("refuses to divide by an empty pipeline instead of rendering NaN", () => {
    assert.equal(shareOf(0, 0), null);
    assert.equal(formatPercent(shareOf(0, 0)), "—");
    assert.equal(formatPercent(null), "—");
  });
});

describe("counts and durations", () => {
  it("groups thousands with a full stop", () => {
    assert.equal(formatCount(1149), "1.149");
    assert.equal(formatCount(232), "232");
    assert.equal(formatCount(0), "0");
    assert.equal(formatCount(1234567), "1.234.567");
  });

  it("keeps the day unit singular at one", () => {
    assert.equal(formatDays(176), "176 dies");
    assert.equal(formatDays(1), "1 dia");
    assert.equal(formatDays(null), "—");
  });

  it("describes a long silence in months rather than days", () => {
    assert.equal(describeElapsed(176), "uns 6 mesos");
    assert.equal(describeElapsed(30), "30 dies");
    assert.equal(describeElapsed(1), "un dia");
    assert.equal(describeElapsed(553), "més d'un any");
    assert.equal(describeElapsed(900), "més de 2 anys");
  });

  it("treats anything past two months as dormant", () => {
    assert.equal(isDormant(176), true);
    assert.equal(isDormant(60), false);
    assert.equal(isDormant(null), false);
  });
});

describe("bar widths", () => {
  it("keeps a tiny non-zero step visible against the first step", () => {
    // 4 of 1.149 is 0.35% — a sliver nobody can tell from the zero bars.
    assert.equal(barWidthPercent(4, 1149), MIN_BAR_PERCENT);
    assert.equal(barWidthPercent(13, 1149), MIN_BAR_PERCENT);
  });

  it("scales the steps that are actually visible", () => {
    assert.equal(barWidthPercent(1149, 1149), 100);
    assert.equal(barWidthPercent(228, 1149), 19.8);
    assert.equal(barWidthPercent(23, 1149), 2);
  });

  it("draws nothing for an empty bucket", () => {
    assert.equal(barWidthPercent(0, 232), 0);
    assert.equal(barWidthPercent(5, 0), 0);
    assert.equal(barWidthPercent(-1, 232), 0);
  });

  it("never overflows its track", () => {
    assert.equal(barWidthPercent(300, 232), 100);
  });
});

describe("stale buckets", () => {
  it("orders fresh to worst and escalates the tone", () => {
    const rows = staleBucketRows({
      upTo6: 0,
      from7To29: 0,
      from30To89: 0,
      from90: 232,
    });
    assert.deepEqual(
      rows.map((row) => row.key),
      ["upTo6", "from7To29", "from30To89", "from90"],
    );
    assert.deepEqual(
      rows.map((row) => row.tone),
      ["ok", "warn", "alert", "danger"],
    );
    assert.equal(rows[3]?.count, 232);
    assert.equal(rows[3]?.label, "90 dies o més");
  });
});

describe("owner stage alignment", () => {
  const funnel = [
    { name: "Prospectes" },
    { name: "Contactats" },
    { name: "Interessats" },
    { name: "Negociant" },
    { name: "Pràctica" },
  ];

  it("labels each count with its ladder stage", () => {
    assert.deepEqual(alignOwnerStages([144, 0, 0, 0, 0], funnel), [
      { name: "Prospectes", count: 144 },
      { name: "Contactats", count: 0 },
      { name: "Interessats", count: 0 },
      { name: "Negociant", count: 0 },
      { name: "Pràctica", count: 0 },
    ]);
  });

  it("drops the unpaired tail rather than mislabelling a column", () => {
    assert.deepEqual(alignOwnerStages([1, 2, 3], funnel).length, 3);
    assert.deepEqual(alignOwnerStages([1, 2, 3, 4, 5, 6], funnel).length, 5);
    assert.deepEqual(alignOwnerStages([], funnel), []);
  });
});

describe("the unclaimed queue", () => {
  const totals = {
    allLeads: 1149,
    activeLeads: 257,
    archivedLeads: 892,
    wonLeads: 4,
    droppedLeads: 57,
    openLeads: 232,
    unassignedLeads: 144,
    staleLeads: 232,
  };
  const unassigned = {
    ownerId: null,
    ownerName: null,
    openLeads: 144,
    staleLeads: 144,
    oldestTouchDays: 553,
    medianTouchDays: 553,
    byStage: [144, 0, 0, 0, 0],
  };
  const named = { ...unassigned, ownerId: 7, ownerName: "Manel Ibars Roma" };

  it("takes the ages from the null-owner row and the count from totals", () => {
    assert.deepEqual(unclaimedQueue([unassigned, named], totals), {
      count: 144,
      openLeads: 232,
      share: 144 / 232,
      medianDays: 553,
      oldestDays: 553,
    });
  });

  it("still reports the count when there is no unassigned row to age", () => {
    assert.deepEqual(unclaimedQueue([named], totals), {
      count: 144,
      openLeads: 232,
      share: 144 / 232,
      medianDays: null,
      oldestDays: null,
    });
  });

  it("hides the oldest wait when it only repeats the median", () => {
    const queue = unclaimedQueue([unassigned], totals);
    assert.equal(showsOldestBesideMedian(queue), false);
    assert.equal(showsOldestBesideMedian({ ...queue, oldestDays: 700 }), true);
    assert.equal(
      showsOldestBesideMedian({ ...queue, medianDays: null }),
      false,
    );
  });
});

describe("owner labels and odoo links", () => {
  it("names the unassigned bucket in Catalan", () => {
    assert.equal(ownerLabel(null), "sense propietari");
    assert.equal(ownerLabel("   "), "sense propietari");
    assert.equal(ownerLabel("Manel Ibars Roma"), "Manel Ibars Roma");
  });

  it("drops a company line that only repeats the lead name", () => {
    assert.equal(leadSubtitle("IBERSPA", "IBERSPA"), null);
    assert.equal(leadSubtitle("IBERSPA", "  iberspa "), null);
    assert.equal(leadSubtitle("Andreu Ibañez", null), null);
    assert.equal(leadSubtitle("Andreu Ibañez", "   "), null);
    assert.equal(leadSubtitle("pràctica estiu", "Acudam"), "Acudam");
  });

  it("builds a lead url without doubling the slash", () => {
    assert.equal(
      odooLeadUrl("https://iaestelleida.odoo.com", 42),
      "https://iaestelleida.odoo.com/odoo/crm/42",
    );
    assert.equal(
      odooLeadUrl("https://iaestelleida.odoo.com/", 42),
      "https://iaestelleida.odoo.com/odoo/crm/42",
    );
  });
});

describe("activity summary", () => {
  it("hides the two zero counters and leads with elapsed time", () => {
    assert.deepEqual(
      summariseActivity({
        lastActivityAt: "2026-03-19T00:00:00.000Z",
        daysSinceLastActivity: 176,
        touchedLast7Days: 0,
        touchedLast30Days: 0,
      }),
      { mode: "elapsed", days: 176, dormant: true },
    );
  });

  it("shows the counters again as soon as somebody touches a lead", () => {
    assert.deepEqual(
      summariseActivity({
        lastActivityAt: "2026-09-10T00:00:00.000Z",
        daysSinceLastActivity: 2,
        touchedLast7Days: 3,
        touchedLast30Days: 9,
      }),
      { mode: "counters", days: 2, dormant: false },
    );
  });

  it("says nothing at all when there has never been an activity", () => {
    assert.deepEqual(
      summariseActivity({
        lastActivityAt: null,
        daysSinceLastActivity: null,
        touchedLast7Days: 0,
        touchedLast30Days: 0,
      }),
      { mode: "unknown", days: null, dormant: false },
    );
  });
});

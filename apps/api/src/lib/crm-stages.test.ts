import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyStage,
  daysSince,
  ladderIndex,
  normaliseStageName,
  parseOdooDatetime,
} from "./crm-stages";

describe("classifyStage", () => {
  it("recognises every ladder stage by id", () => {
    assert.equal(classifyStage(44, "Prospectes"), "ladder");
    assert.equal(classifyStage(45, "Contactats"), "ladder");
    assert.equal(classifyStage(46, "Interessats"), "ladder");
    assert.equal(classifyStage(48, "Negociant"), "ladder");
    assert.equal(classifyStage(8, "Pràctica"), "ladder");
  });

  it("folds both drop-out stages together despite the capitalisation", () => {
    // 54 "No interessats" and 47 "No Interessats" are the same stage twice.
    assert.equal(classifyStage(54, "No interessats"), "dropout");
    assert.equal(classifyStage(47, "No Interessats"), "dropout");
    assert.equal(normaliseStageName("No interessats"), "no interessats");
    assert.equal(normaliseStageName("No Interessats"), "no interessats");
  });

  it("falls back to the name when a stage was re-created with a new id", () => {
    assert.equal(classifyStage(999, "Prospectes"), "ladder");
    assert.equal(classifyStage(999, "PRÀCTICA"), "ladder");
    assert.equal(classifyStage(999, "  no  interessats  "), "dropout");
  });

  it("reports an unknown stage rather than guessing", () => {
    // Callers surface these in their own row; a silent drop would make the
    // totals stop adding up with no visible cause.
    assert.equal(classifyStage(123, "Pendent de resposta"), "unclassified");
  });
});

describe("ladderIndex", () => {
  it("orders the ladder independently of Odoo's broken sequence column", () => {
    assert.equal(ladderIndex(44, "Prospectes"), 0);
    assert.equal(ladderIndex(45, "Contactats"), 1);
    assert.equal(ladderIndex(46, "Interessats"), 2);
    assert.equal(ladderIndex(48, "Negociant"), 3);
    assert.equal(ladderIndex(8, "Pràctica"), 4);
  });

  it("returns -1 for drop-out and unknown stages", () => {
    assert.equal(ladderIndex(54, "No interessats"), -1);
    assert.equal(ladderIndex(47, "No Interessats"), -1);
    assert.equal(ladderIndex(123, "Something else"), -1);
  });
});

describe("parseOdooDatetime", () => {
  it("reads Odoo's naive datetime as UTC, not local time", () => {
    // The whole point: `new Date("2026-03-19 15:10:47")` is local, which on a
    // Europe/Madrid box is an hour or two adrift and can flip a day boundary.
    const parsed = parseOdooDatetime("2026-03-19 15:10:47");

    assert.equal(parsed?.toISOString(), "2026-03-19T15:10:47.000Z");
  });

  it("tolerates surrounding whitespace", () => {
    assert.equal(
      parseOdooDatetime("  2025-09-22 16:25:53 ")?.toISOString(),
      "2025-09-22T16:25:53.000Z",
    );
  });

  it("returns null for a value it cannot parse", () => {
    assert.equal(parseOdooDatetime(""), null);
    assert.equal(parseOdooDatetime("not a date"), null);
  });
});

describe("daysSince", () => {
  it("floors to whole days", () => {
    const from = new Date("2026-03-19T15:10:47.000Z");
    const now = new Date("2026-03-21T15:10:46.000Z").getTime();

    assert.equal(daysSince(from, now), 1);
  });

  it("matches the real dormancy gap on this database", () => {
    const lastActivity = new Date("2026-03-19T15:10:47.000Z");
    const today = new Date("2026-09-12T00:00:00.000Z").getTime();

    assert.equal(daysSince(lastActivity, today), 176);
  });

  it("clamps a future timestamp to zero rather than going negative", () => {
    const from = new Date("2026-09-20T00:00:00.000Z");
    const now = new Date("2026-09-12T00:00:00.000Z").getTime();

    assert.equal(daysSince(from, now), 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bulkOutcomeDetail,
  bulkOutcomeSummary,
  type BulkOutcome,
} from "./bulk-outcome.pure";

const accepted = (n: number) => (n === 1 ? "1 acceptada" : `${n} acceptades`);
const reviewed = (n: number) =>
  n === 1 ? "1 ja estava revisada" : `${n} ja estaven revisades`;
const notAccepted = (n: number) =>
  n === 1 ? "1 no s'ha pogut acceptar" : `${n} no s'han pogut acceptar`;

const outcome = (over: Partial<BulkOutcome> = {}): BulkOutcome => ({
  done: { count: 38, label: accepted },
  skipped: [],
  failed: [],
  ...over,
});

describe("bulk outcome summary", () => {
  it("says only what happened when everything happened", () => {
    assert.equal(bulkOutcomeSummary(outcome()), "38 acceptades");
  });

  // The reason this module exists: a number nobody names is a number nobody
  // chases.
  it("names every non-zero count", () => {
    assert.equal(
      bulkOutcomeSummary(
        outcome({
          skipped: [{ count: 2, label: reviewed }],
          failed: [{ label: "berta@puig.cat", reason: "correu rebutjat" }],
          failedLabel: notAccepted,
        }),
      ),
      "38 acceptades · 2 ja estaven revisades · 1 no s'ha pogut acceptar",
    );
  });

  it("drops a skip reason nothing landed under", () => {
    assert.equal(
      bulkOutcomeSummary(
        outcome({
          skipped: [
            { count: 0, label: reviewed },
            { count: 1, label: (n) => `${n} sense correu` },
          ],
        }),
      ),
      "38 acceptades · 1 sense correu",
    );
  });

  it("counts failures generically when the caller names no verb", () => {
    assert.equal(
      bulkOutcomeSummary(
        outcome({
          done: { count: 1, label: accepted },
          failed: [
            { label: "a@b.cat", reason: "ja no existeix" },
            { label: "c@d.cat", reason: "ja no existeix" },
          ],
        }),
      ),
      "1 acceptada · 2 no s'han pogut fer",
    );
  });
});

describe("bulk outcome detail", () => {
  // Named, not counted: a failure is chased by hand, and a toast that only
  // says "2 han fallat" sends someone to the server logs.
  it("names each failure with its reason", () => {
    assert.equal(
      bulkOutcomeDetail(
        outcome({
          failed: [
            { label: "berta@puig.cat", reason: "correu rebutjat" },
            { label: "pau@roca.cat", reason: "ja no existeix" },
          ],
        }),
      ),
      "berta@puig.cat: correu rebutjat, pau@roca.cat: ja no existeix",
    );
  });

  // `reportBulkOutcome` turns this into the toast: a description means a
  // warning, never a green one, however good the ratio was.
  it("is undefined when nothing failed, which is the only green case", () => {
    assert.equal(
      bulkOutcomeDetail(outcome({ skipped: [{ count: 4, label: reviewed }] })),
      undefined,
    );
  });
});

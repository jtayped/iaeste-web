import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  selectionSummary,
  tableSelectionCount,
  tableSelectionValue,
  toggleTableRow,
  type StoredTableSelection,
} from "./use-table-selection";

const MEMBERS = { singular: "membre", plural: "membres" };

describe("table selection", () => {
  it("keeps explicit ids selected across pages", () => {
    let selection: StoredTableSelection = {
      scope: "members",
      all: false,
      rowIds: new Set(),
    };
    selection = toggleTableRow(selection, "page-1", true);
    selection = toggleTableRow(selection, "page-2", true);
    selection = toggleTableRow(selection, "page-1", false);

    assert.equal(tableSelectionCount(selection, 50), 1);
    assert.deepEqual(tableSelectionValue(selection), {
      mode: "ids",
      rowIds: ["page-2"],
    });
  });

  it("represents all matching rows as exclusions", () => {
    let selection: StoredTableSelection = {
      scope: "members?q=aina",
      all: true,
      rowIds: new Set(),
    };
    selection = toggleTableRow(selection, "already-registered", false);

    assert.equal(tableSelectionCount(selection, 37), 36);
    assert.deepEqual(tableSelectionValue(selection), {
      mode: "all",
      excludedRowIds: ["already-registered"],
    });
  });
});

describe("selection summary", () => {
  it("says what a select-all across pages actually selected", () => {
    assert.equal(
      selectionSummary({
        count: 24,
        total: 35,
        allPages: true,
        unit: MEMBERS,
      }),
      "24 de 35 membres · totes les pàgines",
    );
  });

  it("counts hand-picked rows against the same denominator", () => {
    assert.equal(
      selectionSummary({ count: 3, total: 35, allPages: false, unit: MEMBERS }),
      "3 de 35 membres",
    );
  });

  it("drops the denominator and the plural when there is one of each", () => {
    assert.equal(
      selectionSummary({ count: 1, total: 1, allPages: false, unit: MEMBERS }),
      "1 membre",
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  tableSelectionCount,
  tableSelectionValue,
  toggleTableRow,
  type StoredTableSelection,
} from "./use-table-selection";

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

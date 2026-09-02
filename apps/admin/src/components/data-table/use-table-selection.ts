"use client";

import * as React from "react";

import type { DataTableSelectionValue } from "@/components/data-table/types";

export interface StoredTableSelection {
  scope: string;
  all: boolean;
  rowIds: Set<string>;
}

const EMPTY_IDS = new Set<string>();

/**
 * Selection state for a paginated, server-filtered table.
 *
 * `rowIds` means included ids while `all` is false and excluded ids while it
 * is true. The scope travels with the state so a search/filter change clears
 * selection during that render, without an effect that briefly shows stale
 * checks against a new result set.
 */
export function useTableSelection(scope: string, total: number) {
  const [stored, setStored] = React.useState<StoredTableSelection>({
    scope,
    all: false,
    rowIds: EMPTY_IDS,
  });

  const current =
    stored.scope === scope
      ? stored
      : ({
          scope,
          all: false,
          rowIds: EMPTY_IDS,
        } satisfies StoredTableSelection);
  const count = tableSelectionCount(current, total);

  const update = React.useCallback(
    (change: (selection: StoredTableSelection) => StoredTableSelection) => {
      setStored((previous) => {
        const base =
          previous.scope === scope
            ? previous
            : { scope, all: false, rowIds: EMPTY_IDS };
        return change(base);
      });
    },
    [scope],
  );

  const clear = React.useCallback(() => {
    setStored({ scope, all: false, rowIds: EMPTY_IDS });
  }, [scope]);

  const toggleAll = React.useCallback(
    (selected: boolean) => {
      setStored({ scope, all: selected, rowIds: EMPTY_IDS });
    },
    [scope],
  );

  const toggleRow = React.useCallback(
    (rowId: string, selected: boolean) => {
      update((selection) => toggleTableRow(selection, rowId, selected));
    },
    [update],
  );

  const isSelected = React.useCallback(
    (rowId: string) =>
      current.all ? !current.rowIds.has(rowId) : current.rowIds.has(rowId),
    [current],
  );

  const value = tableSelectionValue(current);

  return {
    count,
    value,
    clear,
    toggleAll,
    toggleRow,
    isSelected,
    allSelected: total > 0 && count === total,
    isIndeterminate: count > 0 && count < total,
  };
}

export function toggleTableRow(
  selection: StoredTableSelection,
  rowId: string,
  selected: boolean,
): StoredTableSelection {
  const rowIds = new Set(selection.rowIds);
  if (selection.all) {
    if (selected) rowIds.delete(rowId);
    else rowIds.add(rowId);
  } else if (selected) {
    rowIds.add(rowId);
  } else {
    rowIds.delete(rowId);
  }
  return { ...selection, rowIds };
}

export function tableSelectionCount(
  selection: StoredTableSelection,
  total: number,
): number {
  return selection.all
    ? Math.max(0, total - selection.rowIds.size)
    : selection.rowIds.size;
}

export function tableSelectionValue(
  selection: StoredTableSelection,
): DataTableSelectionValue {
  return selection.all
    ? { mode: "all", excludedRowIds: [...selection.rowIds] }
    : { mode: "ids", rowIds: [...selection.rowIds] };
}

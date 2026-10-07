"use client";

import {
  TableSearch,
  TableSelectFilter,
  TableToolbar,
  type FilterOption,
} from "@/components/data-table/toolbar";

export interface MembersFiltersProps {
  q: string;
  onSearch: (next: string) => void;
  source: string;
  sourceOptions: readonly FilterOption[];
  onSourceChange: (next: string) => void;
  /** Absent until there is a campaign to invite anyone to. */
  targetId?: string;
  targetOptions: readonly FilterOption[];
  onTargetChange: (next: string) => void;
  /** Controls set to something other than their default, counted by the page. */
  activeCount: number;
}

/**
 * The members toolbar: a search box and the two campaign selects.
 *
 * Stacked on a 390px screen the three of them are some 230px of chrome above
 * the first row, which leaves about four members visible on a list of twenty.
 * So this toolbar is `collapsible`: below `md` they fold behind one `filtres`
 * button, and from `md` the button is gone and the controls are simply there,
 * as on every other list.
 */
export function MembersFilters({
  q,
  onSearch,
  source,
  sourceOptions,
  onSourceChange,
  targetId,
  targetOptions,
  onTargetChange,
  activeCount,
}: MembersFiltersProps) {
  return (
    <TableToolbar
      collapsible={{ activeCount }}
      search={
        <TableSearch
          id="members-search"
          value={q}
          placeholder="nom, cognoms o correu"
          onCommit={onSearch}
        />
      }
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <TableSelectFilter
          id="members-source"
          label="membres de"
          value={source}
          options={sourceOptions}
          onChange={onSourceChange}
        />
        {targetId === undefined ? null : (
          <TableSelectFilter
            id="members-target"
            label="convida a"
            value={targetId}
            options={targetOptions}
            onChange={onTargetChange}
          />
        )}
      </div>
    </TableToolbar>
  );
}

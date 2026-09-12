"use client";

import * as React from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

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
 * Below `md` they collapse behind one `filtres` button; from `md` the button
 * is gone and the controls are simply there, as on every other list.
 *
 * The button carries the number of filters currently narrowing the list. A
 * collapsed filter is otherwise invisible state — the list looks wrong and
 * nothing on screen says why.
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
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full justify-between md:hidden"
        aria-expanded={open}
        aria-controls="members-filters"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden />
          filtres
          {activeCount > 0 ? (
            <Badge aria-label={`${activeCount} filtres actius`}>
              {activeCount}
            </Badge>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </Button>

      <div
        id="members-filters"
        className={cn(open ? "block" : "hidden", "md:block")}
      >
        <TableToolbar>
          <TableSearch
            id="members-search"
            value={q}
            placeholder="nom, cognoms o correu"
            onCommit={onSearch}
          />
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
      </div>
    </div>
  );
}

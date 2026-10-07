"use client";

import * as React from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";

import {
  TableExportButton,
  useTableExportControl,
} from "@/components/data-table/export-button";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export interface TableToolbarProps {
  /** The search box. It shares the first row with the export control. */
  search: React.ReactNode;
  /** The filters, on the rows under the search. */
  children?: React.ReactNode;
  /**
   * Below `md`, folds the search and the filters behind one `filtres` button.
   * `activeCount` is how many controls are set away from their default; the
   * button shows it, because a folded filter is otherwise invisible state:
   * the list looks wrong and nothing on screen says why.
   */
  collapsible?: { activeCount: number };
}

/**
 * The block above a table: a search row, then the filters.
 *
 * Search, a tab set and a campaign select together are wider than the content
 * column even at its 960px cap, so one row holding all of them has to wrap or
 * overflow, and the export control at its end is what it would overflow
 * into. So this is a two-column grid instead: the table's export control
 * (`useTableExportControl`) owns the second column of the first row, the
 * search takes the rest of that row, and the filters span both columns
 * underneath, where they can wrap freely. The export therefore ends the first
 * row at every width, and every stacked row on a phone ends at the same edge.
 *
 * `items-end` keeps the export level with the search input under its label,
 * and with the `filtres` button, which is the same 44px.
 */
export function TableToolbar({
  search,
  children,
  collapsible,
}: TableToolbarProps) {
  const exportControl = useTableExportControl();
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const folded = collapsible !== undefined && !open ? "max-md:hidden" : null;

  return (
    <div
      className={cn(
        "grid min-w-0 items-end gap-3",
        exportControl ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1",
      )}
    >
      {/* Cells are placed explicitly, so the DOM order is free to follow the
          reading order for the tab key. While the `filtres` button shows, it
          takes the export's row and the search drops to a full-width row of
          its own; from `md` the button is gone and the search moves up
          beside the export. */}
      {collapsible ? (
        <Button
          type="button"
          variant="outline"
          className="col-1 row-1 min-h-11 w-full justify-between md:hidden"
          aria-expanded={open}
          aria-controls={
            children ? `${id}-search ${id}-filters` : `${id}-search`
          }
          onClick={() => setOpen(!open)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" aria-hidden />
            filtres
            {collapsible.activeCount > 0 ? (
              <Badge aria-label={`${collapsible.activeCount} filtres actius`}>
                {collapsible.activeCount}
              </Badge>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
      ) : null}

      <div
        id={`${id}-search`}
        className={cn(
          collapsible ? "col-span-full md:col-1 md:row-1" : "col-1 row-1",
          folded,
        )}
      >
        {search}
      </div>

      {exportControl ? (
        <TableExportButton {...exportControl} className="col-2 row-1" />
      ) : null}

      {children ? (
        // Stacked full-width on a phone. From `lg` the filters sit side by
        // side and wrap onto another line when they do not fit, rather than
        // running past the column.
        <div
          id={`${id}-filters`}
          className={cn(
            "col-span-full flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end [&>*]:min-w-0",
            folded,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The standard search box.
 *
 * It keeps what you typed in local state so typing stays instant, and commits
 * the debounced value upwards — where it becomes a URL parameter and then a
 * request. It never filters anything itself.
 */
export function TableSearch({
  id,
  value,
  placeholder,
  label = "cerca",
  onCommit,
}: {
  id: string;
  value: string;
  placeholder: string;
  label?: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  const debounced = useDebouncedValue(draft.trim());

  // The URL is the source of truth, so a change that did not come from this
  // box (a filter reset, the back button) has to be reflected back into it.
  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = React.useRef(onCommit);
  commit.current = onCommit;

  React.useEffect(() => {
    if (debounced !== value.trim()) commit.current(debounced);
    // `value` is deliberately not a dependency: this effect fires when the
    // debounced draft settles, and re-running it as the URL catches up would
    // push the same parameter a second time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="w-full space-y-1.5 lg:max-w-xs">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          className="h-11 pl-9 sm:h-9"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

/** A compact server-side filter for lists with more than a few options. */
export function TableSelectFilter({
  id,
  value,
  options,
  onChange,
  label,
}: {
  id: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (next: string) => void;
  label: string;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    // The tooltip sits on the field, not the trigger, which takes no `title`
    // of its own; hovering the control still picks this one up.
    <div className="min-w-0 space-y-1.5" title={selected?.label}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        {/* A campaign label runs to `curs 2026-2027 · inscripcions obertes`,
            which no fixed track width holds. The trigger keeps a floor so the
            control never shrinks to a stub, and the label ellipsizes inside it
            rather than spilling over the page — the whole of it stays on
            `title`. */}
        <SelectTrigger
          id={id}
          className="h-11 w-full min-w-0 sm:h-9 sm:w-auto sm:max-w-72 sm:min-w-56"
        >
          <SelectValue className="truncate" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * The standard segmented filter. Every option maps to a parameter the API
 * understands — a filter the API cannot apply does not belong here.
 */
export function TableFilter({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: readonly FilterOption[];
  onChange: (next: string) => void;
  label?: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      {label ? (
        <span className="block text-xs text-muted-foreground">{label}</span>
      ) : null}
      {/* Four options do not fit 360px, and a two-word label such as `sense
          verificar` does not fit a track that is sized for one. Both are the
          same fix: the labels never wrap — a wrapped tab is taller than the
          track and its pill bleeds past the edges — and `TabsList` scrolls
          sideways in its own container, with the chevrons it already draws,
          at every width rather than only on a phone. */}
      <Tabs value={value} onValueChange={onChange}>
        <TabsList aria-label={label} className="max-w-full">
          {options.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="whitespace-nowrap"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";

import { useDebouncedValue } from "@/lib/use-debounced-value";

/**
 * The block above a table: the search box, then the filters, as its children.
 *
 * Stacked full-width on a phone. From `sm` they sit on one line, packed to the
 * left, and wrap onto another when they do not fit: search, a tab set and a
 * campaign select together are wider than the content column even at its
 * 960px cap. `items-end` keeps the inputs level under their labels, and
 * `min-w-0` lets a tab set too wide for a line of its own shrink and scroll
 * inside itself rather than run past the column.
 */
export function TableToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 *:min-w-0 sm:flex-row sm:flex-wrap sm:items-end">
      {children}
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
    // Grows from 12rem to 20rem on the toolbar line, so it gives way before
    // the filters beside it have to wrap. At 12rem it still holds its
    // placeholder, and sol·licituds' five tabs and campaign select fit
    // beside it in the 960px column.
    <div className="w-full space-y-1.5 sm:max-w-xs sm:flex-1 sm:basis-48">
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
              className="h-11 whitespace-nowrap sm:h-9"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

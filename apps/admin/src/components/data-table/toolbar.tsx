"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";

import { useDebouncedValue } from "@/lib/use-debounced-value";

/** The row that holds a table's search box and its filters. */
export function TableToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between [&>*]:min-w-0">
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
    <div className="w-full space-y-1.5 lg:max-w-xs">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
      <Tabs value={value} onValueChange={onChange}>
        {/* Four options do not fit 360px: the list scrolls sideways in its own
            container rather than wrapping or shrinking the labels. */}
        <div className="max-w-full overflow-x-auto pb-1">
          <TabsList className="w-max">
            {options.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="min-h-9"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}

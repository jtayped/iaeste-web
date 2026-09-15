"use client";

import { X } from "lucide-react";

import { Button } from "@repo/ui/button";

/**
 * The bar that appears once something is selected.
 *
 * It is sticky at the bottom of the list rather than inserted above it: ticking
 * the first checkbox used to push the table down by its own height, so the row
 * under the cursor moved and a second click landed on the row below it. From
 * down here it can only ever cover the pager, and it stays in view while you
 * keep ticking your way down a long page.
 */
export function SelectionBar({
  summary,
  children,
  onClear,
}: {
  summary: string;
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <div className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-lg border border-primary/30 bg-background/95 p-2.5 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <p className="px-1 text-sm font-medium tabular-nums" aria-live="polite">
        {summary}
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row [&>*]:min-h-11 sm:[&>*]:min-h-9">
        <Button variant="outline" size="sm" onClick={onClear}>
          <X className="size-4" aria-hidden />
          desselecciona
        </Button>
        {children}
      </div>
    </div>
  );
}

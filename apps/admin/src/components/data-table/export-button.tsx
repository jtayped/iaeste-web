"use client";

import { Download, Loader2 } from "lucide-react";

import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

import type { DataTableExport } from "@/components/data-table/types";

/**
 * The CSV export control, drawn by `<DataTable>` at the end of its toolbar row
 * so it sits in the same place on every list.
 *
 * Icon-only below `md`: exporting a spreadsheet is the least likely thing
 * anyone does from a phone, and the label would take its width from the
 * search box and the filters beside it. It is 44px square there, and from
 * `sm` the same 36px as the toolbar's inputs.
 */
export function TableExportButton({
  csvExport,
  disabled,
}: {
  csvExport: DataTableExport;
  disabled: boolean;
}) {
  const Icon = csvExport.isPending ? Loader2 : Download;

  return (
    <Button
      variant="outline"
      size="sm"
      className="size-11 shrink-0 sm:size-9 md:w-auto"
      disabled={disabled || csvExport.isPending}
      onClick={csvExport.download}
    >
      <Icon
        className={cn("size-4", csvExport.isPending && "animate-spin")}
        aria-hidden
      />
      <span className="sr-only md:not-sr-only">
        {csvExport.isPending ? "exportant…" : "exporta csv"}
      </span>
    </Button>
  );
}

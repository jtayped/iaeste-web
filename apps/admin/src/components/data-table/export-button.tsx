"use client";

import { Download, Loader2 } from "lucide-react";

import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

import type { DataTableExport } from "@/components/data-table/types";

/**
 * The CSV export control. `<DataTable>` draws it in the page header, through
 * `<PageAction>`, as the secondary action beside the page's own. Its size
 * comes from the header's action row: 44px tall and a full-width share of the
 * row on a phone, the compact control height from `sm`.
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
      disabled={disabled || csvExport.isPending}
      onClick={csvExport.download}
    >
      <Icon
        className={cn("size-4", csvExport.isPending && "animate-spin")}
        aria-hidden
      />
      {csvExport.isPending ? "exportant…" : "exporta csv"}
    </Button>
  );
}

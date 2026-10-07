"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

import type { DataTableExport } from "@/components/data-table/types";

interface TableExportControl {
  csvExport: DataTableExport;
  disabled: boolean;
}

const TableExportContext = React.createContext<TableExportControl | null>(null);

/**
 * How `<DataTable>` hands its export control to `<TableToolbar>`. The toolbar
 * arrives as an element the table did not build, so it cannot be given the
 * control as a prop.
 */
export const TableExportProvider = TableExportContext.Provider;

/** The enclosing table's export control, or `null` when it has none. */
export function useTableExportControl() {
  return React.useContext(TableExportContext);
}

/**
 * The CSV export control. `<TableToolbar>` draws it at the end of the search
 * row, which is the toolbar's first row at every width, so it sits in the same
 * place on every list and never competes with the filters for a line.
 *
 * Icon-only below `md`: exporting a spreadsheet is the least likely thing
 * anyone does from a phone, and the label would take its width from the
 * search box beside it. It is 44px square there, and from `sm` the same 36px
 * as the toolbar's inputs.
 */
export function TableExportButton({
  csvExport,
  disabled,
  className,
}: TableExportControl & { className?: string }) {
  const Icon = csvExport.isPending ? Loader2 : Download;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("size-11 shrink-0 sm:size-9 md:w-auto", className)}
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

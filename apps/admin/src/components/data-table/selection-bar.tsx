"use client";

import { X } from "lucide-react";

import { Button } from "@repo/ui/button";

export function SelectionBar({
  count,
  children,
  onClear,
}: {
  count: number;
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 sm:flex-row sm:items-center sm:justify-between"
      aria-live="polite"
    >
      <p className="px-1 text-sm font-medium tabular-nums">
        {count} {count === 1 ? "fila seleccionada" : "files seleccionades"}
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

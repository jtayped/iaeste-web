"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@repo/ui/button";

/**
 * Offset pagination for the members list.
 *
 * It says which slice you are looking at as well as offering the two steps —
 * "21–40 de 63" is what tells you whether the person you are looking for is
 * simply on the next page, and it is the only feedback that the count is
 * shrinking as you type in the search box.
 */
export function Pagination({
  total,
  limit,
  offset,
  busy,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  busy: boolean;
  onChange: (offset: number) => void;
}) {
  if (total <= limit) return null;

  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  const hasPrevious = offset > 0;
  const hasNext = to < total;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {from}–{to} de {total}
      </p>
      <div className="flex gap-2 [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:min-h-9 sm:[&>*]:flex-none">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious || busy}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          <ChevronLeft className="size-4" aria-hidden />
          anteriors
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext || busy}
          onClick={() => onChange(offset + limit)}
        >
          següents
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

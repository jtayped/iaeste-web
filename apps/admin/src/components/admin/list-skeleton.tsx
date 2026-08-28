import { Skeleton } from "@repo/ui/skeleton";

/**
 * The placeholder every list on this app shows while its first page is in
 * flight. It draws the same stacked card the real rows use, so the layout does
 * not jump when the data lands — the same contract `(app)/loading.tsx` has
 * with `<PageShell>`.
 */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy aria-label="carregant">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border border-border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** A single block placeholder, for a detail panel rather than a list. */
export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      className={className ?? "h-40 rounded-lg"}
      aria-busy
      aria-label="carregant"
    />
  );
}

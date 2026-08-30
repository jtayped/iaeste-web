import { Skeleton } from "@repo/ui/skeleton";

/**
 * The placeholder `<DataTable>` shows while its first page is in flight.
 *
 * It draws a header band and evenly spaced row bands at the same height the
 * real rows land at, so the table does not jump when the data arrives — the
 * same contract `(app)/loading.tsx` has with `<PageShell>`.
 */
export function TableSkeleton({
  columns = 4,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-border"
      aria-busy
      aria-label="carregant"
    >
      <div className="flex gap-4 border-b border-border bg-default/40 px-4 py-3">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-4">
            {Array.from({ length: columns }, (_, index) => (
              <Skeleton key={index} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

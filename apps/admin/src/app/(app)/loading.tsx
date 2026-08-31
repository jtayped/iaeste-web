import { Skeleton } from "@repo/ui/skeleton";

import { PAGE_CONTAINER_CLASS } from "@/components/shell/page-shell";

/**
 * Shown while a page's server fetch is in flight. It mirrors what
 * `<PageShell>` renders — mobile crumb trail, title, description, then the
 * overview — inside the same container, so nothing shifts when the real
 * content lands. The desktop breadcrumb belongs to the already-painted header
 * and appears there with the page.
 */
export default function Loading() {
  return (
    <div className={PAGE_CONTAINER_CLASS} aria-busy aria-label="carregant">
      <div className="space-y-6 md:space-y-8">
        <div>
          <Skeleton className="mb-4 h-4 w-40 md:hidden" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-[6.5rem] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

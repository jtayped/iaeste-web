import { Skeleton } from "@repo/ui/skeleton";

import { PAGE_CONTAINER_CLASS } from "@/components/shell/page-shell";

/**
 * Shown while a page's server fetch is in flight. It mirrors what
 * `<PageShell>` renders — crumb trail, title, description, then a grid of
 * cards — inside the same container, so nothing shifts when the real content
 * lands. The shell itself (sidebar, header) is already painted by the layout
 * above and is not re-skeletoned here.
 *
 * The breadcrumb is part of the skeleton now that it is page-owned data: it
 * arrives with the page, not with the chrome.
 */
export default function Loading() {
  return (
    <div className={PAGE_CONTAINER_CLASS} aria-busy aria-label="carregant">
      <div className="space-y-6 md:space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
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

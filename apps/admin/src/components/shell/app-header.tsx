import Link from "next/link";

import { Separator } from "@repo/ui/separator";

import { NotificationsToggle } from "@/components/pwa/notifications-toggle";
import { CampaignContext } from "@/components/shell/campaign-context";
import { SidebarToggle } from "@/components/shell/sidebar-toggle";
import type { AdminOverview } from "@/lib/overview";

/**
 * Sticky, one hairline, no shadow. Stable chrome only: the breadcrumb moved
 * into `<PageShell>` when it became page-declared data, because a header
 * rendered by the layout cannot see the record a dynamic leaf names.
 *
 * At 360px this is a hamburger, the app's name, and the notifications toggle —
 * the campaign context needs more room than that and is held back to `md`,
 * where it has somewhere to sit without shoving the toggle off the edge.
 */
export function AppHeader({ overview }: { overview: AdminOverview | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:gap-2 md:px-4">
      <SidebarToggle />
      <Separator orientation="vertical" className="mx-1 hidden h-4 md:block" />

      {/* The sidebar carries the wordmark on `md+`; under it the sidebar is a
          closed drawer, so the header has to say where you are. */}
      <Link
        href="/"
        className="truncate rounded-md px-1 text-sm font-semibold tracking-tight ring-ring outline-none focus-visible:ring-2 md:hidden"
      >
        iaeste lleida
      </Link>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        {overview ? (
          <div className="hidden pl-2 md:block">
            <CampaignContext overview={overview} />
          </div>
        ) : null}
        <NotificationsToggle />
      </div>
    </header>
  );
}

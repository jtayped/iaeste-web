import { Separator } from "@repo/ui/separator";

import { NotificationsToggle } from "@/components/pwa/notifications-toggle";
import {
  CampaignContext,
  campaignContextText,
} from "@/components/shell/campaign-context";
import { HeaderTitle } from "@/components/shell/header-title";
import { SidebarToggle } from "@/components/shell/sidebar-toggle";
import type { AdminOverview } from "@/lib/overview";

/**
 * Sticky, one hairline, no shadow. On desktop the page-owned breadcrumb mounts
 * into the reserved slot beside the sidebar toggle; below `md` the page offers
 * a back link in the content column instead.
 *
 * At 360px the middle of the bar is two stacked lines rather than one: which
 * page you are on, and which campaign everything on it is scoped to. Both are
 * things you lose as soon as you scroll, and side by side neither would fit
 * between the hamburger and the notifications toggle.
 */
export function AppHeader({
  overview,
  showNotifications,
}: {
  overview: AdminOverview | null;
  showNotifications: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:gap-2 md:px-4">
      <SidebarToggle />
      <Separator orientation="vertical" className="mx-1 hidden h-4 md:block" />

      <div
        data-desktop-breadcrumbs
        className="hidden min-w-0 flex-1 overflow-hidden md:block"
      />

      {/* The sidebar carries the wordmark on `md+`; under it the sidebar is a
          closed drawer, so the header has to say where you are. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center leading-tight md:hidden">
        <HeaderTitle fallback="iaeste lleida" />
        {overview ? (
          <span
            title={campaignContextText(overview)}
            className="truncate px-1 text-[0.6875rem] text-muted-foreground"
          >
            {campaignContextText(overview)}
          </span>
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        {overview ? (
          <div className="hidden pl-2 md:block">
            <CampaignContext overview={overview} />
          </div>
        ) : null}
        {showNotifications ? <NotificationsToggle /> : null}
      </div>
    </header>
  );
}

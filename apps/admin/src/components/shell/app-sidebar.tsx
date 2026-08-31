import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@repo/ui/sidebar";

import { NavUser } from "@/components/shell/nav-user";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import type { ExternalNavHrefs } from "@/lib/nav";
import type { AdminSessionUser } from "@/lib/session.server";

/**
 * `collapsible="icon"` rather than `offcanvas`: on `md+` the nav should still
 * be reachable when it is out of the way. The collapsed state persists through
 * the `sidebar_state` cookie the shadcn provider writes and the layout reads
 * back into `defaultOpen`.
 *
 * Under `md` this same component renders itself as a `Sheet` — that is built
 * into `@repo/ui/sidebar`, driven by the provider's `isMobile`. The hamburger
 * that opens it is `<SidebarToggle>` in the header. See this app's AGENTS.md
 * for why there is no bottom tab bar.
 */
export function AppSidebar({
  user,
  pendingCount,
  externalHrefs,
}: {
  user: AdminSessionUser;
  pendingCount: number;
  externalHrefs: ExternalNavHrefs;
}) {
  return (
    <Sidebar
      collapsible="icon"
      mobileTitle="navegació"
      mobileDescription="seccions del dashboard d'administració"
    >
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none ring-sidebar-ring focus-visible:ring-2"
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-[0.6875rem] font-semibold tracking-tight text-sidebar-primary-foreground"
              >
                LC
              </span>
              <span className="grid leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold">
                  iaeste lleida
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  administració
                </span>
              </span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNav pendingCount={pendingCount} externalHrefs={externalHrefs} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
          <SidebarSeparator className="my-1" />
          <SidebarMenuItem>
            <NavUser user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

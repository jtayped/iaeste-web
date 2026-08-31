import Link from "next/link";

import { Logo } from "@repo/ui/logo";
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
  registrationsActive,
  externalHrefs,
}: {
  user: AdminSessionUser;
  pendingCount: number;
  registrationsActive: boolean;
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
              className="flex items-center gap-2 rounded-md px-1.5 py-1 ring-sidebar-ring outline-none focus-visible:ring-2"
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#0B3E5B]"
              >
                <Logo variant="icon" color="white" width={18} alt="" />
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
        <SidebarNav
          role={user.role}
          pendingCount={pendingCount}
          registrationsActive={registrationsActive}
          externalHrefs={externalHrefs}
        />
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

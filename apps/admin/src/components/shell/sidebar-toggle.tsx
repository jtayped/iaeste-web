"use client";

import { Menu, PanelLeft } from "lucide-react";

import { Button } from "@repo/ui/button";
import { useSidebar } from "@repo/ui/sidebar";

/**
 * Replaces `<SidebarTrigger>` because the control means two different things
 * at the two sizes, and should look like it: under `md` the shadcn `Sidebar`
 * renders itself as a `Sheet`, so this is a hamburger that opens a drawer; on
 * `md+` it collapses the persistent rail, which is what `PanelLeft` says.
 *
 * 44px square on a phone — the shared `SidebarTrigger` is a fixed 28px, which
 * is under the touch-target floor this app holds itself to.
 */
export function SidebarToggle() {
  const { toggleSidebar, isMobile, openMobile, open } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-expanded={isMobile ? openMobile : open}
      aria-label="obre o tanca la navegació"
      className="-ml-1 size-11 shrink-0 md:size-8"
    >
      <Menu className="size-5 md:hidden" aria-hidden />
      <PanelLeft className="hidden size-4 md:block" aria-hidden />
    </Button>
  );
}

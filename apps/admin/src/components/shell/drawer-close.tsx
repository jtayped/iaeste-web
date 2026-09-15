"use client";

import { X } from "lucide-react";

import { Button } from "@repo/ui/button";
import { useSidebar } from "@repo/ui/sidebar";

/**
 * The way out of the mobile nav drawer.
 *
 * Without it the only dismissal is the strip of dimmed page left over beside
 * the drawer — about 20% of the screen on a phone, and nothing about it looks
 * like a control. On `md+` the sidebar is a persistent rail with its own
 * collapse toggle in the header, so this renders nothing there.
 */
export function DrawerClose() {
  const { isMobile, setOpenMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="tanca la navegació"
      className="size-11 shrink-0"
      onClick={() => setOpenMobile(false)}
    >
      <X className="size-5" aria-hidden />
    </Button>
  );
}

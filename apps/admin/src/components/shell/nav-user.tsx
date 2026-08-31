"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@repo/ui/sidebar";
import { toast } from "@repo/ui/toast";

import { signOut } from "@/lib/auth-client";
import type { AdminSessionUser } from "@/lib/session.server";

/** Two letters from the name, or the first of the address as a last resort. */
function initials(user: AdminSessionUser): string {
  const source = user.name ?? user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? (parts[1]?.charAt(0) ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

export function NavUser({ user }: { user: AdminSessionUser }) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [pending, setPending] = React.useState(false);

  const displayName = user.name ?? user.email;

  // The redirect is a hard `replace` plus `refresh` so the authenticated
  // layout re-runs on the server: a client-side push would keep the cached
  // shell — and the signed-in user's name in it — on screen.
  async function handleSignOut() {
    setPending(true);
    const result = await signOut();
    if (result.error) {
      setPending(false);
      toast.error("no s'ha pogut tancar la sessió", {
        description: "torna-ho a provar en uns segons.",
      });
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <SidebarMenuButton size="lg" tooltip={displayName}>
          <Avatar className="size-7 rounded-md">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="rounded-md text-[0.6875rem]">
              {initials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-medium">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--trigger-width) min-w-56"
        placement={isMobile ? "bottom end" : "right bottom"}
        offset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="grid leading-tight">
            <span className="truncate text-sm font-medium text-foreground">
              {displayName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* The menu stays open while the request is in flight, so the pending
            label is somewhere the user can still see it. */}
        <DropdownMenuItem
          disabled={pending}
          shouldCloseOnSelect={false}
          onAction={() => {
            void handleSignOut();
          }}
        >
          <LogOut className="size-4" aria-hidden />
          {pending ? "tancant la sessió…" : "tanca la sessió"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

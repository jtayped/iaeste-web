"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/sidebar";

import {
  externalNavItems,
  isActive,
  navGroups,
  type ExternalNavHrefs,
  type ExternalNavItem,
  type NavGroupId,
  type NavItem,
} from "@/lib/nav";

/** 44px rows inside the mobile sheet, back to the compact 32px on `md+`. */
const ROW_CLASS = "h-11 md:h-8";

/**
 * `pendingCount` is the review queue's size, from `GET /v1/admin/overview`.
 * Zero renders no badge at all rather than a `0` — a badge is there to pull
 * the eye, and one that is always present stops doing that.
 *
 * `externalHrefs` carries the one link that leaves the app (the blog CMS).
 * It arrives as a prop because its origin is server-only config.
 *
 * Tapping any row closes the mobile sheet. Client navigation swaps the page
 * underneath without unmounting the sidebar, so the drawer would otherwise sit
 * open over the page you just asked for. `setOpenMobile` is a no-op on `md+`,
 * where the sidebar is a persistent rail and closing it would be wrong.
 */
export function SidebarNav({
  pendingCount,
  externalHrefs,
}: {
  pendingCount: number;
  externalHrefs: ExternalNavHrefs;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const dismiss = () => {
    setOpenMobile(false);
  };

  const badgeFor = (item: NavItem) =>
    item.badge === "pending" && pendingCount > 0 ? pendingCount : null;

  const externalFor = (groupId: NavGroupId) =>
    externalNavItems.filter((item) => item.group === groupId);

  return (
    <>
      {navGroups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const badge = badgeFor(item);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className={ROW_CLASS}
                      isActive={isActive(item, pathname)}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={dismiss}>
                        <item.icon className="size-4" aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {badge === null ? null : (
                      <SidebarMenuBadge>{badge}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}

              {externalFor(group.id).map((item) => (
                <ExternalNavRow
                  key={item.key}
                  item={item}
                  href={externalHrefs[item.key]}
                  onNavigate={dismiss}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

/**
 * A plain `<a>`, not a `<Link>`: this leaves the Next app entirely, so there is
 * no route to prefetch and client navigation would only get in the way. The
 * trailing icon is there because the tab it opens is a different product
 * (Keystatic on the marketing site) and a new tab you did not expect is
 * disorienting.
 */
function ExternalNavRow({
  item,
  href,
  onNavigate,
}: {
  item: ExternalNavItem;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className={ROW_CLASS} tooltip={item.label}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
        >
          <item.icon className="size-4" aria-hidden />
          <span>
            {item.label}
            <span className="sr-only"> (s&apos;obre en una pestanya nova)</span>
          </span>
          <ExternalLink
            className="ml-auto size-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden"
            aria-hidden
          />
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

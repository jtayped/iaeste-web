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
  externalNavLabel,
  isActive,
  navGroups,
  type ExternalNavHrefs,
  type ExternalNavItem,
  type NavItem,
} from "@/lib/nav";
import { can } from "@/lib/permissions";

/** 44px rows inside the mobile sheet, back to the compact 32px on `md+`. */
const ROW_CLASS = "h-11 md:h-8";

/**
 * `pendingCount` is the review queue's size, from `GET /v1/admin/overview`.
 * Zero renders no badge at all rather than a `0` — a badge is there to pull
 * the eye, and one that is always present stops doing that.
 *
 * `externalHrefs` carries the links that leave the app (the marketing site,
 * the blog CMS, Odoo). They arrive as a prop because two of the three origins
 * are server-only config; they render in their own section pinned to the
 * bottom, never interleaved with a nav group.
 *
 * Tapping any row closes the mobile sheet. Client navigation swaps the page
 * underneath without unmounting the sidebar, so the drawer would otherwise sit
 * open over the page you just asked for. `setOpenMobile` is a no-op on `md+`,
 * where the sidebar is a persistent rail and closing it would be wrong.
 */
export function SidebarNav({
  role,
  pendingCount,
  registrationsActive,
  externalHrefs,
}: {
  role: string | null;
  pendingCount: number;
  registrationsActive: boolean;
  externalHrefs: ExternalNavHrefs;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const dismiss = () => {
    setOpenMobile(false);
  };

  const badgeFor = (item: NavItem) =>
    item.badge === "pending" && pendingCount > 0 ? pendingCount : null;

  return (
    <>
      {navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            can({ user: { role } }, item.capability),
          ),
        }))
        .filter(
          (group) =>
            group.items.length > 0 &&
            (group.id !== "inscripcions" || registrationsActive),
        )
        .map((group) => (
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

      {/* Pinned to the bottom: links out of the admin app. Not a nav group —
          no route matching, no breadcrumb, no `<Link>` prefetch. */}
      <SidebarGroup className="mt-auto">
        <SidebarGroupLabel>{externalNavLabel}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {externalNavItems.map((item) => (
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
    </>
  );
}

/**
 * A plain `<a>`, not a `<Link>`: this leaves the Next app entirely, so there is
 * no route to prefetch and client navigation would only get in the way. The
 * trailing icon is there because the tab it opens is a different product and a
 * new tab you did not expect is disorienting.
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

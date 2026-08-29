import {
  Building2,
  LayoutDashboard,
  Mail,
  Newspaper,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The single catalogue of admin routes: the sidebar, the breadcrumb, and every
 * page title all read from here, so a route can never be labelled two
 * different things in two places.
 *
 * URLs stay ASCII and English; labels are lowercase Catalan. That split is
 * deliberate — `sol·licituds` percent-encodes into something unreadable in a
 * log line, and the Catalan-copy rule is about text the user sees, not about
 * paths (see the plan's "Routes and navigation").
 */
export type NavGroupId = "principal" | "equip" | "organitzacio";

export interface NavItem {
  href: string;
  /** Lowercase Catalan, shown in the sidebar and as the breadcrumb leaf. */
  label: string;
  icon: LucideIcon;
  /** Only `/` needs an exact match; the rest own their subtrees. */
  exact?: boolean;
  /** Set for the one item that carries the pending-review count. */
  badge?: "pending";
}

export interface NavGroup {
  id: NavGroupId;
  /** Lowercase Catalan group heading. */
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: "principal",
    label: "principal",
    items: [
      { href: "/", label: "panell", icon: LayoutDashboard, exact: true },
      {
        href: "/registrations",
        label: "sol·licituds",
        icon: Mail,
        badge: "pending",
      },
    ],
  },
  {
    id: "equip",
    label: "equip",
    items: [
      { href: "/members", label: "membres", icon: Users },
      { href: "/invitations", label: "convits", icon: Mail },
    ],
  },
  {
    id: "organitzacio",
    label: "organització",
    items: [{ href: "/campaigns", label: "campanyes", icon: Building2 }],
  },
];

/**
 * Links that leave the admin app. They are filed into a sidebar group so they
 * sit where you would look for them, but they are kept out of `navGroups` on
 * purpose: they are not routes of this app, so they must never match
 * `isActive`, never resolve a breadcrumb, and never be prefetched by `<Link>`.
 *
 * The href is not here either — `blog` points at `${CMS_PUBLIC_ORIGIN}/admin`,
 * and `CMS_PUBLIC_ORIGIN` is server-only config. The layout resolves it and
 * passes it down, so nothing about the CMS origin reaches this module.
 */
export type ExternalNavKey = "blog";

export interface ExternalNavItem {
  key: ExternalNavKey;
  label: string;
  icon: LucideIcon;
  group: NavGroupId;
}

export const externalNavItems: ExternalNavItem[] = [
  { key: "blog", label: "continguts", icon: Newspaper, group: "organitzacio" },
];

/** Resolved at render time by the server layout, one href per external item. */
export type ExternalNavHrefs = Record<ExternalNavKey, string>;

const allItems = navGroups.flatMap((group) => group.items);

/** True when `href` is the nav entry that owns `pathname`. */
export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * The nav entry whose subtree contains `pathname`, if any. Detail routes such
 * as `/members/abc` resolve to their list page, which is what the breadcrumb
 * wants as its parent.
 */
export function findNavItem(pathname: string): NavItem | undefined {
  return allItems.find((item) => isActive(item, pathname));
}

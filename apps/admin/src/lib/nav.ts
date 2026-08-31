import {
  Building2,
  Globe,
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
export type NavGroupId = "principal" | "organitzacio";

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
      { href: "/", label: "dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    id: "organitzacio",
    label: "organització",
    items: [
      {
        href: "/registrations",
        label: "sol·licituds",
        icon: Mail,
        badge: "pending",
      },
      { href: "/members", label: "membres", icon: Users },
      { href: "/invitations", label: "convits", icon: Mail },
      { href: "/campaigns", label: "campanyes", icon: Building2 },
    ],
  },
];

/**
 * Links that leave the admin app entirely. They render in their own section
 * pinned to the bottom of the sidebar and are kept out of `navGroups` on
 * purpose: they are not routes of this app, so they must never match
 * `isActive`, never resolve a breadcrumb, and never be prefetched by `<Link>`.
 *
 * Two of the three hrefs are not here either — `web` and `blog` come from
 * server-only origin config (`WEB_PUBLIC_ORIGIN`, `${CMS_PUBLIC_ORIGIN}/admin`)
 * that the layout resolves and passes down, so nothing about those origins
 * reaches this module. `odoo` is a fixed SaaS URL with no env var.
 */
export type ExternalNavKey = "web" | "blog" | "odoo";

export interface ExternalNavItem {
  key: ExternalNavKey;
  label: string;
  icon: LucideIcon;
}

/** Lowercase Catalan heading for the bottom-pinned external-links section. */
export const externalNavLabel = "enllaços externs";

/** Fixed Odoo SaaS URL — no env var, so it lives here as a constant. */
export const ODOO_URL = "https://iaestelleida.odoo.com";

export const externalNavItems: ExternalNavItem[] = [
  { key: "web", label: "web", icon: Globe },
  { key: "blog", label: "blog", icon: Newspaper },
  { key: "odoo", label: "odoo", icon: Building2 },
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

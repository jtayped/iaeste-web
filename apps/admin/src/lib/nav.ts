import {
  Building2,
  ChartNoAxesColumn,
  Globe,
  Inbox,
  LayoutDashboard,
  Newspaper,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";

import { can, type Capability } from "@/lib/permissions";

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
export type NavGroupId = "principal" | "inscripcions" | "organitzacio";

export interface NavItem {
  href: string;
  /** Lowercase Catalan, shown in the sidebar and as the breadcrumb leaf. */
  label: string;
  icon: LucideIcon;
  /** Capability enforced by the matching route subtree. */
  capability: Capability;
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
      {
        href: "/",
        label: "dashboard",
        icon: LayoutDashboard,
        capability: "admin.access",
        exact: true,
      },
      {
        href: "/analytics",
        label: "analítiques",
        icon: ChartNoAxesColumn,
        capability: "analytics.read",
      },
    ],
  },
  {
    id: "inscripcions",
    label: "inscripcions",
    items: [
      {
        href: "/registrations",
        label: "sol·licituds",
        icon: Inbox,
        capability: "registrations.review",
        badge: "pending",
      },
      {
        href: "/invitations",
        label: "invitacions",
        icon: Send,
        capability: "invitations.write",
      },
    ],
  },
  {
    id: "organitzacio",
    label: "organització",
    items: [
      {
        href: "/members",
        label: "membres",
        icon: Users,
        capability: "members.read",
      },
      {
        href: "/campaigns",
        label: "campanyes",
        icon: Building2,
        capability: "campaigns.write",
      },
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
  /**
   * Capability required to be shown this link, when it needs one. The blog CMS
   * and Odoo are separate products with their own accounts and no SSO, so a
   * member who follows either lands on a sign-in they cannot pass — a dead end
   * dressed as part of the app. The public site is left ungated: it is the
   * site, and anyone can open it.
   */
  capability?: Capability;
}

/** Lowercase Catalan heading for the bottom-pinned external-links section. */
export const externalNavLabel = "enllaços externs";

/** Fixed Odoo SaaS URL — no env var, so it lives here as a constant. */
export const ODOO_URL = "https://iaestelleida.odoo.com";

export const externalNavItems: ExternalNavItem[] = [
  { key: "web", label: "web", icon: Globe },
  { key: "blog", label: "blog", icon: Newspaper, capability: "tools.open" },
  { key: "odoo", label: "odoo", icon: Building2, capability: "tools.open" },
];

/** Resolved at render time by the server layout, one href per external item. */
export type ExternalNavHrefs = Record<ExternalNavKey, string>;

const allItems = navGroups.flatMap((group) => group.items);

/**
 * The groups a given role may actually see, with the items it may not reach
 * removed and any group that empties out dropped entirely.
 *
 * The sidebar is the only consumer, but the filter lives here, next to the
 * catalogue it filters and away from JSX, so what a member is shown is a
 * testable fact rather than a rendering detail. `registrationsActive` hides
 * the intake group out of season even from the people who own it — an empty
 * queue nobody can fill is noise, not a section.
 */
export function visibleNavGroups(
  role: string | null,
  registrationsActive: boolean,
): NavGroup[] {
  return navGroups
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
    );
}

/** The out-of-app links a given role may see — see `ExternalNavItem`. */
export function visibleExternalNavItems(
  role: string | null,
): ExternalNavItem[] {
  return externalNavItems.filter(
    (item) => !item.capability || can({ user: { role } }, item.capability),
  );
}

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

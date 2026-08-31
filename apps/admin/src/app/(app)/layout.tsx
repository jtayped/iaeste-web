import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@repo/env/admin/server";
import { SidebarInset, SidebarProvider } from "@repo/ui/sidebar";

import { ErrorState } from "@/components/error-state";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { ODOO_URL } from "@/lib/nav";
import { fetchOverview } from "@/lib/overview.server";
import { pendingWorkCount } from "@/lib/overview";
import { can } from "@/lib/permissions";
import { getServerSession } from "@/lib/session.server";

// Everything under here reads the session cookie, so nothing is prerenderable.
// Stated explicitly rather than left to be inferred from `cookies()`, so a
// future page that stops reading cookies can't silently become static and
// start serving one admin's numbers to everyone.
export const dynamic = "force-dynamic";

// The client sidebar writes its collapsed state to this cookie. The name is
// hardcoded rather than imported as `SIDEBAR_COOKIE_NAME` from
// `@repo/ui/sidebar-context`: that module is `"use client"`, and a Server
// Component importing a plain value export from a client module receives a
// client reference, not the string — `cookies().get(SIDEBAR_COOKIE_NAME)` was
// silently `cookies().get(undefined)`, so a collapsed sidebar always sprang
// back open on reload. `setOpen` in `sidebar-context.tsx` writes this same
// literal; keep the two in sync.
const SIDEBAR_STATE_COOKIE = "sidebar_state";

/**
 * The authenticated shell, and the second half of the plan's "doubled"
 * enforcement.
 *
 * The API independently applies `requireCapability` to every `/v1/admin/*`
 * route, and that is the authorization. The shell check only decides whether
 * an authenticated account may enter the product; each page subtree applies
 * its own narrower capability before rendering.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getServerSession();

  // An unreachable API is not an unauthenticated visitor. Sending them to
  // /sign-in would offer a sign-in that cannot work and would bounce them
  // straight back here once it failed.
  if (result.status === "unreachable") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <ErrorState
          title="l'administració no està disponible"
          detail={result.message}
        />
      </main>
    );
  }

  if (result.status === "anonymous") redirect("/sign-in");
  if (!can(result.session, "admin.access")) {
    redirect("/sign-in?error=no-access");
  }

  const canReadDashboard = can(result.session, "dashboard.read");
  const canManageNotifications = can(result.session, "notifications.manage");
  const overview = canReadDashboard ? await fetchOverview() : null;

  // The API disagreeing about this admin-only capability outranks the local
  // role check. A revoked or malformed session must not render stale counts.
  if (overview?.status === "forbidden") {
    redirect("/sign-in?error=no-access");
  }

  const data = overview?.status === "ok" ? overview.overview : null;
  const pendingCount = data ? pendingWorkCount(data.counts) : 0;
  const registrationsActive = Boolean(data?.registrationOpenCampaign);

  // Absent cookie ⇒ open, matching the provider's own `defaultOpen = true`.
  const defaultOpen =
    (await cookies()).get(SIDEBAR_STATE_COOKIE)?.value !== "false";

  // Resolved here because the origins are server-only config: the sidebar is a
  // client component and must never import `@repo/env`. `blog` points at the
  // Payload CMS admin — a separate product with its own accounts, no SSO in v1
  // — and `odoo` is a fixed SaaS URL kept as a constant in `nav.ts`.
  const externalHrefs = {
    web: env.WEB_PUBLIC_ORIGIN,
    blog: `${env.CMS_PUBLIC_ORIGIN}/admin`,
    odoo: ODOO_URL,
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        user={result.session.user}
        pendingCount={pendingCount}
        registrationsActive={registrationsActive}
        externalHrefs={externalHrefs}
      />
      <SidebarInset className="min-w-0">
        <AppHeader overview={data} showNotifications={canManageNotifications} />
        {/* The content column belongs to `<PageShell>` — it is shared with
            `loading.tsx`, so the skeleton and the page it becomes line up. */}
        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
      <ServiceWorker />
    </SidebarProvider>
  );
}

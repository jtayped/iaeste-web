import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@repo/env/admin/server";
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
} from "@repo/ui/sidebar";

import { ErrorState } from "@/components/error-state";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { fetchOverview } from "@/lib/overview.server";
import { pendingWorkCount } from "@/lib/overview";
import { can } from "@/lib/permissions";
import { getServerSession } from "@/lib/session.server";

// Everything under here reads the session cookie, so nothing is prerenderable.
// Stated explicitly rather than left to be inferred from `cookies()`, so a
// future page that stops reading cookies can't silently become static and
// start serving one admin's numbers to everyone.
export const dynamic = "force-dynamic";

/**
 * The authenticated shell, and the second half of the plan's "doubled"
 * enforcement.
 *
 * The API independently applies `requireCapability` to every `/v1/admin/*`
 * route, and that is the authorization. This check exists so a member who is
 * not an admin gets a clear answer instead of a shell full of failed requests
 * — it is not what keeps them out.
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

  const overview = await fetchOverview();

  // The API disagreeing about `admin.access` outranks the check above — it is
  // the one with the database.
  if (overview.status === "forbidden") redirect("/sign-in?error=no-access");

  const data = overview.status === "ok" ? overview.overview : null;
  const pendingCount = data ? pendingWorkCount(data.counts) : 0;

  const defaultOpen =
    (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  // Resolved here because `WEB_PUBLIC_ORIGIN` is server-only config: the
  // sidebar is a client component and must never import `@repo/env`.
  const externalHrefs = { blog: `${env.WEB_PUBLIC_ORIGIN}/keystatic` };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        user={result.session.user}
        pendingCount={pendingCount}
        externalHrefs={externalHrefs}
      />
      <SidebarInset className="min-w-0">
        <AppHeader overview={data} />
        {/* The content column belongs to `<PageShell>` — it is shared with
            `loading.tsx`, so the skeleton and the page it becomes line up. */}
        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
      <ServiceWorker />
    </SidebarProvider>
  );
}

import Link from "next/link";
import { CalendarRange } from "lucide-react";

import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

import { CampaignSummary } from "@/components/dashboard/campaign-summary";
import { PendingWork } from "@/components/dashboard/pending-work";
import { StatSection } from "@/components/dashboard/stat-section";
import { membershipStats, pendingStats } from "@/components/dashboard/stats";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageShell } from "@/components/shell/page-shell";
import { adminMetadata } from "@/lib/page-title";
import { fetchOverview } from "@/lib/overview.server";

export const dynamic = "force-dynamic";

// The dashboard *is* the root, so its breadcrumb is empty: the shell's own
// `panell` crumb is the whole trail, and the tab reads just `panell`.
const TITLE = "panell";

export const metadata = adminMetadata([], TITLE);

/**
 * A plain server-component fetch — no TanStack Query. These numbers are read
 * once per page view and nothing on this page mutates them, so a cache layer
 * would buy nothing (the plan's "Data fetching": Query is for the review queue
 * and the members table).
 *
 * The layout resolved the same call, and `fetchOverview` is `cache()`d, so
 * this is one HTTP request, not two.
 */
export default async function DashboardPage() {
  const result = await fetchOverview();

  // `forbidden` never reaches here — the layout redirects on it first.
  if (result.status !== "ok") {
    return (
      <PageShell title={TITLE}>
        <ErrorState
          detail={
            result.status === "error" ? result.message : "resposta inesperada"
          }
        />
      </PageShell>
    );
  }

  const { currentCampaign, registrationOpenCampaign, counts } = result.overview;

  if (currentCampaign === null) {
    return (
      <PageShell title={TITLE} description="encara no hi ha res a mostrar.">
        <EmptyState
          icon={CalendarRange}
          title="cap campanya activa"
          description="els comptadors es calculen sobre la campanya actual. quan n'hi hagi una de marcada com a actual, aquest panell s'omplirà tot sol."
          action={
            <Link
              href="/campaigns"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              ves a campanyes
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={TITLE}
      description={`resum de la campanya ${currentCampaign.label}.`}
    >
      <PendingWork pendingReview={counts.pendingReview} />
      <StatSection title="sol·licituds" stats={pendingStats(counts)} />
      <StatSection title="equip" stats={membershipStats(counts)} />
      <CampaignSummary
        currentCampaign={currentCampaign}
        registrationOpenCampaign={registrationOpenCampaign}
      />
    </PageShell>
  );
}

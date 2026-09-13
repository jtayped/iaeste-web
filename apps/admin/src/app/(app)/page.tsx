import Link from "next/link";
import { CalendarRange, LayoutDashboard } from "lucide-react";

import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

import { CampaignSummary } from "@/components/dashboard/campaign-summary";
import { MemberWelcome } from "@/components/dashboard/member-welcome";
import {
  RegistrationOverview,
  TeamOverview,
} from "@/components/dashboard/overview-panels";
import { PendingWork } from "@/components/dashboard/pending-work";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageShell } from "@/components/shell/page-shell";
import { adminMetadata } from "@/lib/page-title";
import { fetchOverview } from "@/lib/overview.server";
import { can, type Capability } from "@/lib/permissions";
import { getServerSession } from "@/lib/session.server";

export const dynamic = "force-dynamic";

// The dashboard *is* the root, so its breadcrumb is empty: the shell's own
// `dashboard` crumb is the whole trail, and the tab reads just `dashboard`.
const TITLE = "dashboard";

export const metadata = adminMetadata([], TITLE);

/**
 * A plain server-component fetch — no TanStack Query. These numbers are read
 * once per page view and nothing on this page mutates them, so a cache layer
 * would buy nothing (the plan's "Data fetching": Query is for the review queue
 * and the members table).
 *
 * The layout resolved the same call, and `fetchOverview` is `cache()`d, so
 * this is one HTTP request, not two.
 *
 * One page, two audiences. An admin gets the review queue, the links into
 * `/members` and `/campaigns`, and the registration funnel. A member gets the
 * team counts, the current campaign and a welcome — the same numbers, none of
 * the doors. The split is by capability rather than by role, so a narrower
 * tier added to `byRole` later lands somewhere sensible without touching this
 * file.
 */
export default async function DashboardPage() {
  const session = await getServerSession();

  // A session that did not resolve is the layout's problem — it has already
  // redirected or rendered its error screen. Assuming "allowed" here keeps
  // this page from second-guessing it with a misleading empty state.
  const holds = (capability: Capability) =>
    session.status !== "ok" || can(session.session, capability);

  const canReadDashboard = holds("dashboard.read");
  const canReviewRegistrations = holds("registrations.review");
  const canReadMembers = holds("members.read");
  const canWriteCampaigns = holds("campaigns.write");

  // Whoever cannot read the members table is not on the organising side of the
  // committee, and this is their landing page rather than a stop on the way to
  // the queue.
  const welcome = canReadMembers ? null : (
    <MemberWelcome
      name={session.status === "ok" ? session.session.user.name : null}
    />
  );

  if (!canReadDashboard) {
    return (
      <PageShell title={TITLE} description="el teu espai dins del comitè.">
        <EmptyState
          icon={LayoutDashboard}
          title="encara no hi ha res per a tu"
          description="el teu compte no té cap eina disponible ara mateix. quan n'afegim una, apareixerà aquí."
        />
      </PageShell>
    );
  }

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
  const registrationsActive =
    registrationOpenCampaign !== null && canReviewRegistrations;

  if (currentCampaign === null) {
    return (
      <PageShell title={TITLE} description="encara no hi ha res a mostrar.">
        {welcome}
        <EmptyState
          icon={CalendarRange}
          title="cap campanya activa"
          description="els comptadors es calculen sobre la campanya actual. quan n'hi hagi una de marcada com a actual, aquest dashboard s'omplirà tot sol."
          action={
            canWriteCampaigns ? (
              <Link
                href="/campaigns"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                ves a campanyes
              </Link>
            ) : undefined
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
      {welcome}
      {registrationsActive ? (
        <PendingWork pendingReview={counts.pendingReview} />
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)] lg:gap-8">
        <TeamOverview counts={counts} linked={canReadMembers} />
        <div className="space-y-6 md:space-y-8">
          {registrationsActive ? (
            <RegistrationOverview counts={counts} />
          ) : null}
          <CampaignSummary
            currentCampaign={currentCampaign}
            registrationOpenCampaign={registrationOpenCampaign}
            linked={canWriteCampaigns}
            showRegistration={canReviewRegistrations}
          />
        </div>
      </div>
    </PageShell>
  );
}

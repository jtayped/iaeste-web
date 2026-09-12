import { ActivityBanner } from "@/components/analytics/activity-banner";
import { ColdLeadsTable } from "@/components/analytics/cold-leads-table";
import { FreshnessFooter } from "@/components/analytics/freshness-footer";
import { FunnelPanel } from "@/components/analytics/funnel-panel";
import { HeadlineMetrics } from "@/components/analytics/headline";
import { LimitsNote } from "@/components/analytics/limits-note";
import { OutcomesPanel } from "@/components/analytics/outcomes-panel";
import { OwnersTable } from "@/components/analytics/owners-table";
import { StalePanel } from "@/components/analytics/stale-panel";
import { UnavailableState } from "@/components/analytics/unavailable-state";
import { ErrorState } from "@/components/error-state";
import { PageShell } from "@/components/shell/page-shell";
import { fetchCrmAnalytics } from "@/lib/analytics.server";
import { adminMetadata } from "@/lib/page-title";

export const dynamic = "force-dynamic";

// The crumb leaf has to match the sidebar label in `lib/nav.ts` exactly, or
// the same route is called two things in two places.
const BREADCRUMB = [{ label: "analítiques" }];
const TITLE = "analítiques";
const DESCRIPTION = "l'estat del crm d'odoo: leads, propietaris i seguiment.";

export const metadata = adminMetadata(BREADCRUMB, TITLE, DESCRIPTION);

/**
 * Four rendered outcomes, all through `<PageShell>`:
 *
 * - `ok` — the snapshot. Dormant data is *this* screen, not an error one: the
 *   read succeeded, the committee simply stopped working the CRM, and the
 *   callout at the top says which of the two it is.
 * - `forbidden` — unreachable in practice (the layout's capability guard
 *   redirects first), kept so the union is exhaustive rather than assumed.
 * - `unavailable` — odoo is down or unconfigured. Somebody else's outage.
 * - `error` — ours.
 */
export default async function AnalyticsPage() {
  const result = await fetchCrmAnalytics();

  if (result.status === "forbidden") {
    return (
      <PageShell
        breadcrumb={BREADCRUMB}
        title={TITLE}
        description={DESCRIPTION}
      >
        <ErrorState
          title="no tens accés a aquestes dades"
          detail="la sessió no té el permís de lectura del dashboard"
        />
      </PageShell>
    );
  }

  if (result.status === "unavailable") {
    return (
      <PageShell
        breadcrumb={BREADCRUMB}
        title={TITLE}
        description={DESCRIPTION}
      >
        <UnavailableState detail={result.message} />
      </PageShell>
    );
  }

  if (result.status === "error") {
    return (
      <PageShell
        breadcrumb={BREADCRUMB}
        title={TITLE}
        description={DESCRIPTION}
      >
        <ErrorState detail={result.message} />
      </PageShell>
    );
  }

  const { analytics } = result;

  return (
    <PageShell breadcrumb={BREADCRUMB} title={TITLE} description={DESCRIPTION}>
      <ActivityBanner activity={analytics.activity} />

      <HeadlineMetrics totals={analytics.totals} owners={analytics.owners} />

      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <FunnelPanel
          funnel={analytics.funnel}
          unclassifiedStages={analytics.unclassifiedStages}
        />
        <StalePanel
          buckets={analytics.staleBuckets}
          openLeads={analytics.totals.openLeads}
        />
      </div>

      <OutcomesPanel
        won={analytics.won}
        droppedLeads={analytics.totals.droppedLeads}
      />

      <OwnersTable owners={analytics.owners} funnel={analytics.funnel} />

      <ColdLeadsTable coldLeads={analytics.coldLeads} />

      <LimitsNote totals={analytics.totals} />

      <FreshnessFooter
        fetchedAt={analytics.fetchedAt}
        stale={analytics.stale}
        truncated={analytics.truncated}
      />
    </PageShell>
  );
}

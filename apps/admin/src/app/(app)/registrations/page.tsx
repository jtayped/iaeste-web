import { Suspense } from "react";
import { CalendarRange } from "lucide-react";

import { TableSkeleton } from "@/components/data-table/table-skeleton";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { RegistrationsQueue } from "@/components/registrations/queue";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchCampaigns } from "@/lib/admin.server";
import { adminMetadata } from "@/lib/page-title";
import { fetchOverview } from "@/lib/overview.server";

export const dynamic = "force-dynamic";

const BREADCRUMB: BreadcrumbEntry[] = [{ label: "sol·licituds" }];
const TITLE = "sol·licituds";
const DESCRIPTION = "qui ha demanat entrar al comitè aquesta campanya.";

export const metadata = adminMetadata(BREADCRUMB, TITLE, DESCRIPTION);

/**
 * The queue is a client component on TanStack Query — it filters, and every
 * row has actions that have to invalidate it. What the server does here is
 * resolve the one thing the query cannot start without: a `campaignId`, which
 * `GET /v1/admin/registrations` requires.
 *
 * The campaign that matters is the one taking registrations, falling back to
 * the current one — in spring those are two different campaigns, and the
 * sol·licituds arriving today belong to the open one.
 */
export default async function RegistrationsPage() {
  const [overview, campaigns] = await Promise.all([
    fetchOverview(),
    fetchCampaigns(),
  ]);

  if (campaigns.status === "error") {
    return (
      <PageShell
        breadcrumb={BREADCRUMB}
        title={TITLE}
        description={DESCRIPTION}
      >
        <ErrorState detail={campaigns.message} />
      </PageShell>
    );
  }

  const rows = campaigns.status === "ok" ? campaigns.data : [];

  if (rows.length === 0) {
    return (
      <PageShell
        breadcrumb={BREADCRUMB}
        title={TITLE}
        description={DESCRIPTION}
      >
        <EmptyState
          icon={CalendarRange}
          title="cap campanya"
          description="les sol·licituds es llisten per campanya. crea'n una a «campanyes» i aquesta pàgina s'omplirà tota sola."
        />
      </PageShell>
    );
  }

  const preferred =
    overview.status === "ok"
      ? (overview.overview.registrationOpenCampaign?.id ??
        overview.overview.currentCampaign?.id)
      : undefined;

  const initialCampaignId =
    rows.find((row) => row.id === preferred)?.id ?? rows[0]?.id ?? "";

  return (
    <PageShell breadcrumb={BREADCRUMB} title={TITLE} description={DESCRIPTION}>
      {/* The queue reads `?status=` and `?campaign=` with `useSearchParams`,
          which Next requires to sit under a Suspense boundary. */}
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <RegistrationsQueue
          campaigns={rows.map((row) => ({
            id: row.id,
            label: row.label,
            isCurrent: row.isCurrent,
          }))}
          initialCampaignId={initialCampaignId}
        />
      </Suspense>
    </PageShell>
  );
}

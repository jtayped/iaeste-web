import { Suspense } from "react";
import { CalendarRange } from "lucide-react";

import { TableSkeleton } from "@/components/data-table/table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { InvitationsTable } from "@/components/invitations/invitations-table";
import { InviteForm } from "@/components/invitations/invite-form";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchCampaigns } from "@/lib/admin.server";
import { adminMetadata } from "@/lib/page-title";
import { fetchOverview } from "@/lib/overview.server";

export const dynamic = "force-dynamic";

const BREADCRUMB: BreadcrumbEntry[] = [{ label: "invitacions" }];
const TITLE = "invitacions";
const DESCRIPTION =
  "qui hem convidat a entrar sense passar pel formulari públic.";

export const metadata = adminMetadata(BREADCRUMB, TITLE, DESCRIPTION);

/**
 * Like the review queue, this page exists to resolve a `campaignId` before the
 * client can ask for anything: `GET /v1/admin/invitations` requires one. The
 * default is the current campaign — you invite people into the team that is
 * running now, not into the one still taking public registrations.
 */
export default async function InvitationsPage() {
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
          description="una invitació sempre és a una campanya concreta. crea'n una a «campanyes» i podràs convidar gent des d'aquí."
        />
      </PageShell>
    );
  }

  const preferred =
    overview.status === "ok"
      ? overview.overview.currentCampaign?.id
      : undefined;
  const initialCampaignId =
    rows.find((row) => row.id === preferred)?.id ?? rows[0]?.id ?? "";

  const options = rows.map((row) => ({
    id: row.id,
    label: row.label,
    isCurrent: row.isCurrent,
  }));

  return (
    <PageShell
      breadcrumb={BREADCRUMB}
      title={TITLE}
      description={DESCRIPTION}
      actions={
        <InviteForm campaigns={options} defaultCampaignId={initialCampaignId} />
      }
    >
      <Suspense fallback={<TableSkeleton columns={4} />}>
        <InvitationsTable
          campaigns={options}
          initialCampaignId={initialCampaignId}
        />
      </Suspense>
    </PageShell>
  );
}

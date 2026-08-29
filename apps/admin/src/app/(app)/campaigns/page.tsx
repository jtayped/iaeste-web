import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { CreateCampaign } from "@/components/campaigns/create-campaign";
import { ErrorState } from "@/components/error-state";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchCampaigns } from "@/lib/admin.server";
import { adminMetadata } from "@/lib/page-title";

export const dynamic = "force-dynamic";

const BREADCRUMB: BreadcrumbEntry[] = [{ label: "campanyes" }];
const TITLE = "campanyes";
const DESCRIPTION = "quina és l'actual, quina té les inscripcions obertes.";

export const metadata = adminMetadata(BREADCRUMB, TITLE, DESCRIPTION);

/**
 * The server fetches the first unfiltered page and hands its rows to the table
 * for first paint. The table owns search, state and page URL parameters and
 * sends them to the API through TanStack Query.
 */
export default async function CampaignsPage() {
  const campaigns = await fetchCampaigns();

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

  return (
    <PageShell
      breadcrumb={BREADCRUMB}
      title={TITLE}
      description={DESCRIPTION}
      actions={<CreateCampaign />}
    >
      <CampaignsTable initialData={rows} />
    </PageShell>
  );
}

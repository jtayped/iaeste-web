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
 * The campaign list has no query parameters, so the server fetches it for the
 * first paint and hands it to the table as `initialData` — the client only
 * refetches after a mutation invalidates it.
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

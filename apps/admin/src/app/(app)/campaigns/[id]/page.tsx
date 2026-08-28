import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CampaignDetail } from "@/components/campaigns/detail";
import { ErrorState } from "@/components/error-state";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchCampaign, fetchCampaigns } from "@/lib/admin.server";
import { adminMetadata } from "@/lib/page-title";

export const dynamic = "force-dynamic";

const DESCRIPTION = "dates, comptadors i canvis d'estat.";
const FALLBACK_LEAF = "detall de la campanya";

function crumb(leaf: string): BreadcrumbEntry[] {
  return [{ label: "campanyes", href: "/campaigns" }, { label: leaf }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchCampaign(id);
  const leaf = result.status === "ok" ? result.data.label : FALLBACK_LEAF;

  return adminMetadata(crumb(leaf), leaf, DESCRIPTION);
}

/**
 * Both `fetchCampaign` and `fetchCampaigns` are the *same* cached request —
 * the first is the second with a `.find()` on top. The whole list is handed to
 * the client component because that is what its query caches under, so the
 * detail and the list page share one entry instead of fighting over it.
 */
export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, campaigns] = await Promise.all([
    fetchCampaign(id),
    fetchCampaigns(),
  ]);

  if (campaign.status === "notFound") notFound();

  if (campaign.status === "error") {
    return (
      <PageShell
        breadcrumb={crumb(FALLBACK_LEAF)}
        title={FALLBACK_LEAF}
        description={DESCRIPTION}
      >
        <ErrorState detail={campaign.message} />
      </PageShell>
    );
  }

  const leaf = campaign.data.label;

  return (
    <PageShell breadcrumb={crumb(leaf)} title={leaf} description={DESCRIPTION}>
      <CampaignDetail
        id={id}
        initialData={
          campaigns.status === "ok" ? campaigns.data : [campaign.data]
        }
      />
    </PageShell>
  );
}

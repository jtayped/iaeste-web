import { Suspense } from "react";

import { TableSkeleton } from "@/components/data-table/table-skeleton";
import { MembersExportMenu } from "@/components/members/export-menu";
import { MembersTable } from "@/components/members/members-table";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchCampaigns } from "@/lib/admin.server";
import { adminMetadata } from "@/lib/page-title";

export const dynamic = "force-dynamic";

const BREADCRUMB: BreadcrumbEntry[] = [{ label: "membres" }];
const TITLE = "membres";
const DESCRIPTION =
  "qui forma part del comitè, ara i abans, i qui renovarà la propera campanya.";

export const metadata = adminMetadata(BREADCRUMB, TITLE, DESCRIPTION);

/**
 * The table itself reads its query from the URL and fetches through TanStack
 * Query, so the server's only job here is the campaign list the export menu
 * offers.
 *
 * `<MembersTable>` calls `useSearchParams`, which Next requires to sit under a
 * Suspense boundary; the fallback is the same skeleton the table shows for its
 * own first fetch, so there is only ever one loading shape on this page.
 */
export default async function MembersPage() {
  const campaigns = await fetchCampaigns();
  const rows = campaigns.status === "ok" ? campaigns.data : [];
  const hasCurrent = rows.some((campaign) => campaign.isCurrent);
  const target =
    rows.find((campaign) => campaign.isRegistrationOpen) ??
    rows.find((campaign) => campaign.isCurrent) ??
    rows[0];
  const source =
    rows.find((campaign) => campaign.isCurrent && campaign.id !== target?.id) ??
    rows.find(
      (campaign) =>
        target &&
        campaign.id !== target.id &&
        new Date(campaign.membershipStartsAt) <
          new Date(target.membershipStartsAt),
    ) ??
    rows.find((campaign) => campaign.id !== target?.id) ??
    target;
  const options = rows.map((campaign) => ({
    id: campaign.id,
    label: campaign.label,
    isCurrent: campaign.isCurrent,
    isRegistrationOpen: campaign.isRegistrationOpen,
  }));

  return (
    <PageShell
      breadcrumb={BREADCRUMB}
      title={TITLE}
      description={DESCRIPTION}
      actions={<MembersExportMenu campaigns={rows} hasCurrent={hasCurrent} />}
    >
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <MembersTable
          campaigns={options}
          initialSource={source ? `campaign:${source.id}` : "all"}
          initialTarget={target?.id ?? ""}
        />
      </Suspense>
    </PageShell>
  );
}

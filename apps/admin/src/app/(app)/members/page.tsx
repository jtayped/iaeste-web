import { Suspense } from "react";

import { TableSkeleton } from "@/components/data-table/table-skeleton";
import { MembersTable } from "@/components/members/members-table";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchCampaigns } from "@/lib/admin.server";
import { adminMetadata } from "@/lib/page-title";
import { hasPageCapability } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

const BREADCRUMB: BreadcrumbEntry[] = [{ label: "membres" }];
const TITLE = "membres";
// The list opens on the current team, and every invitation from it goes to
// the current campaign. Renewing an earlier team is the reason to change
// «membres de», and nothing else on screen says that is how it works.
const DESCRIPTION =
  "qui forma part del comitè, ara i abans. tria un equip anterior a «membres de» per convidar-lo a la campanya actual.";

export const metadata = adminMetadata(BREADCRUMB, TITLE, DESCRIPTION);

/**
 * The table itself reads its query from the URL and fetches through TanStack
 * Query, so the server's only jobs here are the campaign list behind
 * «membres de», which also says which campaign is current, and whether this
 * session may send a broadcast.
 *
 * `<MembersTable>` calls `useSearchParams`, which Next requires to sit under a
 * Suspense boundary; the fallback is the same skeleton the table shows for its
 * own first fetch, so there is only ever one loading shape on this page.
 */
export default async function MembersPage() {
  const [campaigns, canBroadcast] = await Promise.all([
    fetchCampaigns(),
    hasPageCapability("broadcasts.send"),
  ]);
  const rows = campaigns.status === "ok" ? campaigns.data : [];
  const options = rows.map((campaign) => ({
    id: campaign.id,
    label: campaign.label,
    isCurrent: campaign.isCurrent,
  }));

  return (
    <PageShell breadcrumb={BREADCRUMB} title={TITLE} description={DESCRIPTION}>
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <MembersTable campaigns={options} canBroadcast={canBroadcast} />
      </Suspense>
    </PageShell>
  );
}

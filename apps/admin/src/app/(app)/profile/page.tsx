import type { Metadata } from "next";
import { UserRound } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { OwnProfile } from "@/components/profile/own-profile";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchOwnProfile } from "@/lib/admin.server";
import { adminMetadata } from "@/lib/page-title";

export const dynamic = "force-dynamic";

const TITLE = "el meu perfil";
const DESCRIPTION = "revisa i actualitza les teves dades de membre.";
const BREADCRUMB: BreadcrumbEntry[] = [{ label: TITLE }];

export const metadata: Metadata = adminMetadata(BREADCRUMB, TITLE, DESCRIPTION);

export default async function ProfilePage() {
  const result = await fetchOwnProfile();

  return (
    <PageShell breadcrumb={BREADCRUMB} title={TITLE} description={DESCRIPTION}>
      {result.status === "ok" ? (
        <OwnProfile initialData={result.data} />
      ) : result.status === "notFound" ? (
        <EmptyState
          icon={UserRound}
          title="no hi ha cap perfil associat al compte"
          description="demana a una persona administradora que revisi el teu compte de membre."
        />
      ) : (
        <ErrorState
          title="no s'ha pogut carregar el perfil"
          detail={result.message}
        />
      )}
    </PageShell>
  );
}

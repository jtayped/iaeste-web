import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/error-state";
import { MemberDetail } from "@/components/members/detail";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchMember } from "@/lib/admin.server";
import { fullName } from "@/lib/admin-types";
import { adminMetadata } from "@/lib/page-title";

export const dynamic = "force-dynamic";

const DESCRIPTION = "perfil, historial d'altes i baixes, i accions.";
const FALLBACK_LEAF = "fitxa del membre";

function crumb(leaf: string): BreadcrumbEntry[] {
  return [{ label: "membres", href: "/members" }, { label: leaf }];
}

/**
 * The route segment is `[id]` but the API parameter is `userId` — the same
 * value under two names. Renaming the segment would change the URL, so the
 * mapping happens here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchMember(id);
  const leaf =
    result.status === "ok" ? fullName(result.data.profile) : FALLBACK_LEAF;

  return adminMetadata(crumb(leaf), leaf, DESCRIPTION);
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchMember(id);

  if (result.status === "notFound") notFound();

  if (result.status === "error") {
    return (
      <PageShell
        breadcrumb={crumb(FALLBACK_LEAF)}
        title={FALLBACK_LEAF}
        description={DESCRIPTION}
      >
        <ErrorState detail={result.message} />
      </PageShell>
    );
  }

  const leaf = fullName(result.data.profile);

  return (
    <PageShell breadcrumb={crumb(leaf)} title={leaf} description={DESCRIPTION}>
      <MemberDetail userId={id} initialData={result.data} />
    </PageShell>
  );
}

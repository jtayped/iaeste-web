import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/error-state";
import { RegistrationDetail } from "@/components/registrations/detail";
import { PageShell, type BreadcrumbEntry } from "@/components/shell/page-shell";
import { fetchRegistration } from "@/lib/admin.server";
import { fullName } from "@/lib/admin-types";
import { adminMetadata } from "@/lib/page-title";

export const dynamic = "force-dynamic";

const DESCRIPTION = "dades de la sol·licitud, historial i decisió.";

/** The leaf shown while the record itself could not be loaded. */
const FALLBACK_LEAF = "sol·licitud";

function crumb(leaf: string): BreadcrumbEntry[] {
  return [{ label: "sol·licituds", href: "/registrations" }, { label: leaf }];
}

/**
 * The breadcrumb leaf and the tab title are the applicant's name, which means
 * both need the record. `fetchRegistration` is `cache()`d, so this and the
 * page below share one request.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchRegistration(id);
  const leaf =
    result.status === "ok"
      ? fullName(result.data.registration.profileSnapshot)
      : FALLBACK_LEAF;

  return adminMetadata(crumb(leaf), leaf, DESCRIPTION);
}

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchRegistration(id);

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

  const leaf = fullName(result.data.registration.profileSnapshot);

  return (
    <PageShell breadcrumb={crumb(leaf)} title={leaf} description={DESCRIPTION}>
      <RegistrationDetail id={id} initialData={result.data} />
    </PageShell>
  );
}

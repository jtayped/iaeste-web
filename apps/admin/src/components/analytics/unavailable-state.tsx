import { CloudOff } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ODOO_URL } from "@/lib/nav";

/**
 * Odoo, not us.
 *
 * A 503 with `UPSTREAM_UNAVAILABLE` means the API is perfectly healthy and the
 * CRM behind it is unconfigured or unreachable, with no cached snapshot to
 * fall back on. Sharing `ErrorState` here would send whoever is on call to
 * read our own logs for an hour, so this screen names the other system and
 * links to it.
 */
export function UnavailableState({ detail }: { detail: string }) {
  return (
    <EmptyState
      icon={CloudOff}
      title="odoo no respon"
      description={`no hem pogut llegir el crm i no en tenim cap còpia recent: ${detail}. no és un problema d'aquesta pàgina — quan odoo torni, les xifres tornaran soles.`}
      action={
        <a
          href={ODOO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm text-sm text-secondary ring-ring outline-none hover:underline focus-visible:ring-2"
        >
          obre odoo
        </a>
      }
    />
  );
}

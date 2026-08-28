import { PlugZap } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

/**
 * Shown when the API could not be reached or answered with something
 * unexpected. It says which of the two happened, because "no s'ha pogut
 * carregar" alone is what makes an outage take an hour to diagnose. The
 * detail is a server-side message, never the raw response body.
 */
export function ErrorState({
  title = "no s'ha pogut carregar",
  detail,
}: {
  title?: string;
  detail: string;
}) {
  return (
    <EmptyState
      icon={PlugZap}
      title={title}
      description={`no hem pogut parlar amb l'api: ${detail}. torna-ho a provar d'aquí a un moment.`}
    />
  );
}

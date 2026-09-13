"use client";

import { UserCheck } from "lucide-react";

import { Button } from "@repo/ui/button";

import { ConfirmAction } from "@/components/admin/confirm-action";
import type { DataTableSelectionHandle } from "@/components/data-table/types";
import { useBulkAcceptRegistrations } from "@/lib/registrations";

/**
 * Accepting the whole room at once — what the committee does at the AGO.
 *
 * Only offered on the `pending_review` tab, because that is the only status
 * the transition is legal from: the API silently skips anything else, and a
 * button that can only report "0 acceptades" is a button that should not be
 * there. The toast afterwards names the skips and the failed notifications
 * rather than claiming the whole selection went through.
 */
export function BulkAcceptAction({
  campaignId,
  campaignLabel,
  q,
  selection,
}: {
  campaignId: string;
  campaignLabel: string;
  /** The search behind a "select all", replayed by the API. */
  q: string;
  selection: DataTableSelectionHandle;
}) {
  const accept = useBulkAcceptRegistrations();
  const count = selection.count;

  return (
    <ConfirmAction
      trigger={
        <Button size="sm" disabled={accept.isPending}>
          <UserCheck className="size-4" aria-hidden />
          accepta&apos;n {count}
        </Button>
      }
      title={`acceptar ${count} ${count === 1 ? "sol·licitud" : "sol·licituds"}?`}
      description={
        <>
          cadascú passarà a ser membre de {campaignLabel} i rebrà un correu amb
          l&apos;enllaç per entrar al dashboard. les sol·licituds que ja
          s&apos;hagin revisat mentrestant quedaran fora.
        </>
      }
      confirmLabel={accept.isPending ? "acceptant…" : "accepta-les"}
      pending={accept.isPending}
      onConfirm={() =>
        accept.mutate(
          { campaignId, q, selection: selection.value },
          { onSuccess: selection.clear },
        )
      }
    />
  );
}

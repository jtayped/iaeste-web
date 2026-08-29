"use client";

import { Button } from "@repo/ui/button";

import { ActionBar } from "@/components/admin/detail-panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import type { AdminCampaignWithCounts } from "@/lib/admin-types";
import { useCampaignAction } from "@/lib/campaigns";

/**
 * The three state changes a campaign has: open/close its registrations, make
 * it the current one, archive it.
 *
 * Only the archive is confirmed. Opening registrations and handing over the
 * "current" flag are both reversible in one click, and a confirmation on every
 * button is how people learn to click through them.
 */
export function CampaignActions({
  campaign,
}: {
  campaign: AdminCampaignWithCounts;
}) {
  const action = useCampaignAction();
  const pending = action.isPending;
  const id = campaign.id;

  if (campaign.state === "archived") {
    return (
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        aquesta campanya està arxivada. es manté per a l&apos;historial i ja no
        es pot fer servir.
      </p>
    );
  }

  return (
    <ActionBar>
      <Button
        variant={campaign.isRegistrationOpen ? "outline" : "default"}
        disabled={pending}
        onClick={() =>
          action.mutate({
            kind: "registration",
            id,
            open: !campaign.isRegistrationOpen,
          })
        }
      >
        {campaign.isRegistrationOpen
          ? "tanca les inscripcions"
          : "obre les inscripcions"}
      </Button>

      {campaign.isCurrent ? null : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => action.mutate({ kind: "current", id })}
        >
          marca com a actual
        </Button>
      )}

      <ConfirmAction
        trigger={
          <Button variant="outline" disabled={pending}>
            arxiva
          </Button>
        }
        title={`arxivar ${campaign.label}?`}
        description="deixarà de poder rebre inscripcions i altes. l'historial es manté, però no es pot desarxivar des del panell."
        confirmLabel="arxiva"
        destructive
        pending={pending}
        onConfirm={() => action.mutate({ kind: "archive", id })}
      />
    </ActionBar>
  );
}

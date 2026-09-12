"use client";

import { Button } from "@repo/ui/button";

import {
  ActionRow,
  Panel,
  Section,
  SectionNote,
} from "@/components/admin/detail-panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import type { AdminCampaignWithCounts } from "@/lib/admin-types";
import { useCampaignAction } from "@/lib/campaigns";

/**
 * Where the campaign stands, in words.
 *
 * The three badges at the top of the fitxa say the same thing, but a badge is
 * a label and these buttons change state: naming the state in a sentence right
 * above them is what makes "arxiva" a decision instead of a guess.
 */
function stateSentence(campaign: AdminCampaignWithCounts): string {
  const published =
    campaign.state === "draft"
      ? "és un esborrany"
      : "està publicada i és visible al formulari públic";
  const current = campaign.isCurrent
    ? "és la campanya actual"
    : "no és la campanya actual";
  const registrations = campaign.isRegistrationOpen
    ? "té les inscripcions obertes"
    : "té les inscripcions tancades";

  return `ara mateix ${published}, ${current} i ${registrations}.`;
}

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
      <Section title="estat de la campanya">
        <Panel className="p-4">
          <SectionNote className="text-sm">
            aquesta campanya està arxivada. es manté per a l&apos;historial, ja
            no pot rebre inscripcions ni altes, i no es pot desarxivar des del
            dashboard.
          </SectionNote>
        </Panel>
      </Section>
    );
  }

  return (
    <Section title="estat de la campanya" description={stateSentence(campaign)}>
      <Panel className="divide-y divide-border">
        <ActionRow
          title={
            campaign.isRegistrationOpen
              ? "tanca les inscripcions"
              : "obre les inscripcions"
          }
          note={
            campaign.isRegistrationOpen
              ? "el formulari públic deixa d'acceptar sol·licituds a l'instant. les que ja han arribat es queden a la cua, i es poden tornar a obrir des d'aquí."
              : "el formulari públic torna a acceptar sol·licituds a l'instant, encara que la data de tancament ja hagi passat. es poden tornar a tancar des d'aquí."
          }
        >
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
        </ActionRow>

        {campaign.isCurrent ? null : (
          <ActionRow
            title="marca com a actual"
            note="la campanya actual és la que fan servir el dashboard, el formulari d'inscripció i els correus. la que ho és ara deixarà de ser-ho a l'instant."
          >
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => action.mutate({ kind: "current", id })}
            >
              marca com a actual
            </Button>
          </ActionRow>
        )}

        <ActionRow
          title="arxiva"
          note="tanca la campanya per sempre: deixa de rebre inscripcions i altes i desapareix del formulari. l'historial es manté, però des del dashboard no es pot desarxivar."
        >
          <ConfirmAction
            trigger={
              <Button variant="destructive" disabled={pending}>
                arxiva
              </Button>
            }
            title={`arxivar ${campaign.label}?`}
            description="deixarà de poder rebre inscripcions i altes. l'historial es manté, però no es pot desarxivar des del dashboard."
            confirmLabel="arxiva"
            destructive
            pending={pending}
            onConfirm={() => action.mutate({ kind: "archive", id })}
          />
        </ActionRow>
      </Panel>
    </Section>
  );
}

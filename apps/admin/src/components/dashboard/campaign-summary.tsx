import Link from "next/link";

import { Card } from "@repo/ui/card";

import type { AdminCampaignRef } from "@/lib/overview";

function Row({
  role,
  explanation,
  campaign,
  emptyText,
}: {
  role: string;
  explanation: string;
  campaign: AdminCampaignRef | null;
  emptyText: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{role}</p>
        <p className="text-xs text-muted-foreground">{explanation}</p>
      </div>
      {campaign ? (
        <Link
          href="/campaigns"
          className="text-sm font-medium text-secondary underline-offset-4 outline-none hover:underline focus-visible:underline"
        >
          {campaign.label}
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground">{emptyText}</span>
      )}
    </div>
  );
}

/**
 * The header states the campaign context in two words; this restates it with
 * enough words to be unambiguous. Worth the duplication — "current" and "open
 * for registration" are the pair of facts that decide what every other action
 * on this app does, and in spring they are not the same campaign.
 */
export function CampaignSummary({
  currentCampaign,
  registrationOpenCampaign,
}: {
  currentCampaign: AdminCampaignRef | null;
  registrationOpenCampaign: AdminCampaignRef | null;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        campanyes
      </h2>
      <Card className="divide-y divide-border rounded-lg border-border p-0 shadow-none">
        <Row
          role="campanya actual"
          explanation="on viuen les altes i les baixes d'aquest curs"
          campaign={currentCampaign}
          emptyText="cap"
        />
        <Row
          role="inscripcions obertes"
          explanation="on aterren les sol·licituds del formulari públic"
          campaign={registrationOpenCampaign}
          emptyText="tancades"
        />
      </Card>
    </section>
  );
}

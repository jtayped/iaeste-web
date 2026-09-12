import Link from "next/link";

import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

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
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{role}</p>
        <p className="text-xs text-muted-foreground">{explanation}</p>
      </div>
      {campaign ? (
        <Link
          href="/campaigns"
          className="rounded-sm text-sm font-medium text-link underline-offset-4 ring-ring outline-none hover:underline focus-visible:ring-2"
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
  className,
}: {
  currentCampaign: AdminCampaignRef | null;
  registrationOpenCampaign: AdminCampaignRef | null;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        campanyes
      </h2>
      <Card className="grid divide-y divide-border rounded-lg border-border p-0 shadow-none md:grid-cols-2 md:divide-x md:divide-y-0">
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

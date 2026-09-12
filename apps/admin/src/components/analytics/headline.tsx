import { Card } from "@repo/ui/card";

import { Bar, SectionTitle, StatTile } from "@/components/analytics/primitives";
import {
  formatCount,
  formatDays,
  formatPercent,
  shareOf,
  showsOldestBesideMedian,
  unclaimedQueue,
  type CrmOwnerRow,
  type CrmTotals,
  type UnclaimedQueue,
} from "@/lib/analytics";

/** The count and its share of the open pipeline, under whichever figure leads. */
function QueueSize({ queue }: { queue: UnclaimedQueue }) {
  return (
    <div className="mt-3 max-w-md space-y-1.5">
      <p className="text-sm">
        <span className="font-semibold tabular-nums">
          {formatCount(queue.count)}
        </span>{" "}
        <span className="text-muted-foreground">
          leads disponibles per agafar
          {queue.share === null ? null : (
            <> · {formatPercent(queue.share)} dels oberts</>
          )}
        </span>
      </p>
      <Bar value={queue.count} max={queue.openLeads} />
    </div>
  );
}

/**
 * What is waiting to be picked up, and for how long.
 *
 * The unclaimed pool is deliberate: this is a student association, members take
 * on what they have capacity for, and nobody is handed leads in advance. So the
 * count is context, not a finding — a page that puts "144 sense propietari" in
 * the featured slot is telling the committee it has a problem where it has a
 * queue. The figure that does carry a finding is the wait: half the queue has
 * been sitting for 553 days, which is a fact about throughput rather than about
 * whether somebody's name is on a record.
 *
 * When the ages are unknown (no unassigned row in `owners`) the count leads
 * instead, still framed as availability.
 */
function QueueHero({ queue }: { queue: UnclaimedQueue }) {
  if (queue.medianDays === null) {
    return (
      <div className="border-b border-border p-5">
        <p className="text-sm text-muted-foreground">
          leads disponibles per agafar
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {formatCount(queue.count)}
          </p>
          {queue.share === null ? null : (
            <p className="text-lg font-medium text-muted-foreground tabular-nums">
              {formatPercent(queue.share)} dels oberts
            </p>
          )}
        </div>
        <div className="mt-3 max-w-md">
          <Bar value={queue.count} max={queue.openLeads} />
        </div>
        <p className="mt-2 max-w-[54ch] text-xs text-muted-foreground">
          la cua és oberta a propòsit: cada membre agafa el que pot assumir i
          ningú no reparteix feina per endavant.
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-border p-5">
      <p className="text-sm text-muted-foreground">espera mediana de la cua</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-4xl font-semibold tracking-tight tabular-nums">
          {formatDays(queue.medianDays)}
        </p>
        {showsOldestBesideMedian(queue) ? (
          <p className="text-lg font-medium text-muted-foreground tabular-nums">
            el més antic, {formatDays(queue.oldestDays)}
          </p>
        ) : null}
      </div>
      <QueueSize queue={queue} />
      <p className="mt-2 max-w-[54ch] text-xs text-muted-foreground">
        la cua és oberta a propòsit: cada membre agafa el que pot assumir i
        ningú no reparteix feina per endavant. el que val la pena mirar no és
        quants n&apos;hi ha per agafar, sinó quant fa que hi esperen.
      </p>
    </div>
  );
}

/** The supporting counts, read as shares of something rather than as raw totals. */
export function HeadlineMetrics({
  totals,
  owners,
}: {
  totals: CrmTotals;
  owners: CrmOwnerRow[];
}) {
  const queue = unclaimedQueue(owners, totals);
  const staleShare = shareOf(totals.staleLeads, totals.openLeads);

  return (
    <section className="space-y-3">
      <SectionTitle>on som</SectionTitle>
      <Card className="overflow-hidden rounded-lg border-border p-0 shadow-none">
        <QueueHero queue={queue} />
        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatTile
            label="leads oberts"
            value={formatCount(totals.openLeads)}
            hint="actius, dins de l'embut i encara no guanyats. la feina viva."
          />
          <StatTile
            label="leads aturats"
            value={formatCount(totals.staleLeads)}
            hint={
              staleShare === null
                ? "sense tocar des de fa 30 dies o més."
                : `sense tocar des de fa 30 dies o més: ${formatPercent(staleShare)} dels oberts.`
            }
          />
          <StatTile
            label="leads en total"
            value={formatCount(totals.allLeads)}
            hint={`${formatCount(totals.activeLeads)} actius i ${formatCount(totals.archivedLeads)} arxivats des que existeix el crm.`}
          />
        </div>
      </Card>
    </section>
  );
}

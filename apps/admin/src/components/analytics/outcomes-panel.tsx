import { AnalyticsPanel } from "@/components/analytics/primitives";
import { formatCount, formatDays, type CrmAnalytics } from "@/lib/analytics";

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border pb-3 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 max-w-[40ch] text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Closed business. There is no revenue line and no lost-reason breakdown here
 * on purpose: the odoo revenue field is 0 on all 1.149 leads and the lost
 * reason is null on every one of them, so a `0 €` tile or an empty reasons
 * panel would claim we measured something we never received. The footnote at
 * the bottom of the page says so out loud instead.
 *
 * The median is printed with its sample size attached, because four closes is
 * not a trend — it is four closes, and one more could move the figure by weeks.
 */
export function OutcomesPanel({
  won,
  droppedLeads,
}: {
  won: CrmAnalytics["won"];
  droppedLeads: number;
}) {
  return (
    <AnalyticsPanel title="resultats">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-6">
        <Row
          label="pràctiques tancades"
          value={formatCount(won.count)}
          hint="leads que han arribat al final de l'embut."
        />
        <Row
          label="descartats"
          value={formatCount(droppedLeads)}
          hint="leads sortits de l'embut sense tancar."
        />
        {won.medianDaysToClose === null ? null : (
          <Row
            label="mediana per tancar"
            value={formatDays(won.medianDaysToClose)}
            hint={`sobre n = ${formatCount(won.sampleSize)} tancaments. amb una mostra tan petita la xifra és orientativa, no una tendència.`}
          />
        )}
      </div>
    </AnalyticsPanel>
  );
}

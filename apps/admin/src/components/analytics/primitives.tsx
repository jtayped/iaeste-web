import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

import { barWidthPercent, formatCount } from "@/lib/analytics";

/** Matches the dashboard's section heading so the two screens read as one app. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

/** A titled card with an optional caveat line under the heading. */
export function AnalyticsPanel({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <SectionTitle>{title}</SectionTitle>
      <Card className="rounded-lg border-border p-4 shadow-none md:p-5">
        {note ? (
          <p className="mb-4 text-xs text-muted-foreground">{note}</p>
        ) : null}
        {children}
      </Card>
    </section>
  );
}

/**
 * One horizontal bar: a track plus a fill sized as a percentage.
 *
 * Horizontal because every label on this page is a long Catalan stage name,
 * and a single hue because there is only ever one series — a palette here
 * would be inventing a distinction the data does not have. The bar is
 * `aria-hidden`: the label and the count beside it already say everything it
 * encodes, so announcing it again is noise.
 */
export function Bar({ value, max }: { value: number; max: number }) {
  const percent = barWidthPercent(value, max);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-default"
      aria-hidden
    >
      {percent > 0 ? (
        <div
          className="h-full rounded-full bg-secondary"
          style={{ width: `${percent}%` }}
        />
      ) : null}
    </div>
  );
}

/** Label above, bar in the middle, count and caveat on the same baseline. */
export function BarRow({
  label,
  value,
  trailing,
  max,
  hint,
}: {
  label: React.ReactNode;
  value: number;
  /** Right-aligned beside the count — a step rate, a share, a severity chip. */
  trailing?: React.ReactNode;
  max: number;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 text-sm">{label}</div>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-sm font-semibold tabular-nums">
            {formatCount(value)}
          </span>
          {trailing}
        </div>
      </div>
      <Bar value={value} max={max} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * The dashboard's `MetricBody` shape — label above, `tabular-nums` figure,
 * hint below — reused so a number means the same thing on both screens.
 */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: React.ReactNode;
}) {
  return (
    <div className="h-full p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 max-w-[36ch] text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

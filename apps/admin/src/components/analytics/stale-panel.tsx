import {
  CircleCheck,
  Clock,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { AnalyticsPanel, BarRow } from "@/components/analytics/primitives";
import {
  formatPercent,
  shareOf,
  staleBucketRows,
  type CrmStaleBuckets,
  type StaleTone,
} from "@/lib/analytics";

/**
 * Severity carried by three things at once — an icon, the bucket's own label,
 * and a colour — so it survives a greyscale print, a colour-blind reader and a
 * phone in sunlight. The colours are HeroUI's `*-soft-foreground` pair, which
 * is derived per theme and stays legible on both grounds; the bars themselves
 * stay one brand hue, because they are a single series.
 */
const TONE: Record<StaleTone, { icon: LucideIcon; className: string }> = {
  ok: { icon: CircleCheck, className: "text-muted-foreground" },
  warn: { icon: Clock, className: "text-muted-foreground" },
  alert: {
    icon: TriangleAlert,
    className: "text-[var(--warning-soft-foreground)]",
  },
  danger: {
    icon: OctagonAlert,
    className: "text-[var(--danger-soft-foreground)]",
  },
};

export function StalePanel({
  buckets,
  openLeads,
}: {
  buckets: CrmStaleBuckets;
  openLeads: number;
}) {
  const rows = staleBucketRows(buckets);
  const max = rows.reduce((highest, row) => Math.max(highest, row.count), 0);

  return (
    <AnalyticsPanel
      title="des de quan no es toquen"
      note="tots els leads oberts, agrupats pel temps que fa que ningú no hi escriu."
    >
      <ul className="space-y-4">
        {rows.map((row) => {
          const { icon: Icon, className } = TONE[row.tone];
          const share = shareOf(row.count, openLeads);
          return (
            <li key={row.key}>
              <BarRow
                label={
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon
                      className={`size-4 shrink-0 ${className}`}
                      aria-hidden
                    />
                    <span className="truncate">{row.label}</span>
                  </span>
                }
                value={row.count}
                max={max}
                trailing={
                  share === null || row.count === 0 ? null : (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatPercent(share)}
                    </span>
                  )
                }
              />
            </li>
          );
        })}
      </ul>
    </AnalyticsPanel>
  );
}

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

export interface Stat {
  /** Lowercase Catalan. */
  label: string;
  value: number;
  /** One short line explaining what the number counts. */
  hint: string;
  /** Where this number is actionable, if anywhere. */
  href?: string;
  /** Draws the eye only when the number is non-zero work. */
  emphasis?: boolean;
}

/**
 * Flat card, one hairline, no shadow. The number is the only large thing on
 * it; label and hint stay at the app's `text-sm`/`text-xs` base.
 *
 * A card is a link only when its number leads somewhere useful. Wrapping the
 * whole card rather than adding a "veure" affordance keeps the target big
 * without adding a second thing to read.
 */
export function StatCard({ stat }: { stat: Stat }) {
  const emphasise = stat.emphasis === true && stat.value > 0;

  const body = (
    <Card
      className={cn(
        "h-full rounded-lg border-border p-4 shadow-none transition-colors",
        stat.href ? "group-hover:border-secondary/60" : null,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{stat.label}</p>
        {stat.href ? (
          <ArrowUpRight
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums tracking-tight",
          emphasise ? "text-primary" : null,
        )}
      >
        {stat.value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
    </Card>
  );

  if (!stat.href) return body;

  return (
    <Link
      href={stat.href}
      className="group rounded-lg outline-none ring-ring focus-visible:ring-2"
    >
      {body}
    </Link>
  );
}

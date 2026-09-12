import { CloudOff, Scissors } from "lucide-react";

import { formatDateTime } from "@/lib/format";

/**
 * Always visible, never a tooltip: every number above it is a snapshot, and a
 * snapshot with no timestamp is how a five-month-old figure gets quoted in a
 * meeting as today's.
 *
 * `stale` and `truncated` are inline warnings rather than a separate screen —
 * the data is still worth reading in both cases, it just needs an asterisk.
 */
export function FreshnessFooter({
  fetchedAt,
  stale,
  truncated,
}: {
  fetchedAt: string;
  stale: boolean;
  truncated: boolean;
}) {
  return (
    <footer className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
      <p>
        llegit d&apos;odoo el{" "}
        <span className="tabular-nums">{formatDateTime(fetchedAt)}</span> (utc).
        el servidor en guarda una còpia uns 5 minuts, així que aquestes xifres
        poden anar fins a 5 minuts endarrerides.
      </p>
      {stale ? (
        <p className="flex items-start gap-2 text-[var(--warning-soft-foreground)]">
          <CloudOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            odoo no responia a l&apos;última lectura: això és l&apos;última
            còpia bona que tenim, i pot ser més antiga que l&apos;hora
            d&apos;aquí dalt.
          </span>
        </p>
      ) : null}
      {truncated ? (
        <p className="flex items-start gap-2 text-[var(--warning-soft-foreground)]">
          <Scissors className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            la lectura de leads actius ha tocat el seu límit, així que els
            totals es queden curts: hi ha més leads dels que surten aquí.
          </span>
        </p>
      ) : null}
    </footer>
  );
}

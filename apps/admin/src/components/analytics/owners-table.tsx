import { OctagonAlert } from "lucide-react";

import { Card } from "@repo/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
import { cn } from "@repo/ui/lib/utils";

import { SectionTitle } from "@/components/analytics/primitives";
import {
  alignOwnerStages,
  formatCount,
  ownerLabel,
  type CrmFunnelStep,
  type CrmOwnerRow,
} from "@/lib/analytics";

/** Past this, "sense tocar" stops being a backlog and becomes an abandonment. */
const ABANDONED_AFTER_DAYS = 90;

function OldestTouch({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground">—</span>;
  const abandoned = days >= ABANDONED_AFTER_DAYS;
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      {abandoned ? (
        <OctagonAlert
          className="size-3.5 shrink-0 text-[var(--danger-soft-foreground)]"
          aria-hidden
        />
      ) : null}
      <span className={cn("tabular-nums", abandoned && "font-medium")}>
        {formatCount(days)}
      </span>
      {/* Describes the span, never the person holding it: an unclaimed or
          long-untouched lead is a throughput fact, not a verdict. */}
      {abandoned ? (
        <span className="sr-only">més de 90 dies sense tocar</span>
      ) : null}
    </span>
  );
}

/**
 * Who is holding what.
 *
 * Not a `<DataTable>`: that component exists for the paginated, URL-filtered
 * list screens, and this is a fixed, server-rendered breakdown of a snapshot
 * with no query of its own. `@repo/ui/table` carries no `"use client"`, so the
 * whole thing stays a server component.
 *
 * The stage columns are the owner's `byStage` counts, labelled from the
 * funnel's ladder order rather than zipped blind (`alignOwnerStages`). They
 * are hidden below `lg`: five extra numeric columns are worth a sideways
 * scroll to nobody on a phone, and the four that matter fit without one.
 */
export function OwnersTable({
  owners,
  funnel,
}: {
  owners: CrmOwnerRow[];
  funnel: CrmFunnelStep[];
}) {
  const stageNames = funnel.map((step) => step.name);

  return (
    <section className="space-y-3">
      <SectionTitle>propietaris</SectionTitle>
      <Card className="p-0">
        <Table className="w-max min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">propietari</TableHead>
              <TableHead className="px-3 text-right">oberts</TableHead>
              <TableHead className="px-3 text-right">aturats</TableHead>
              <TableHead className="px-3 text-right">toc més antic</TableHead>
              <TableHead className="hidden px-3 text-right sm:table-cell">
                mediana
              </TableHead>
              {stageNames.map((name) => (
                <TableHead
                  key={name}
                  className="hidden px-3 text-right lg:table-cell"
                >
                  {/* Odoo's own stage name, kept as it comes: like a campaign
                      label or a person's name it is record data, not interface
                      copy, and lowercasing it would be editing the source. */}
                  {name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {owners.map((owner) => {
              const stages = alignOwnerStages(owner.byStage, funnel);
              const allStale =
                owner.openLeads > 0 && owner.staleLeads === owner.openLeads;
              return (
                <TableRow key={owner.ownerId ?? "unassigned"}>
                  <TableCell className="px-3 py-3 font-medium">
                    {ownerLabel(owner.ownerName)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right tabular-nums">
                    {formatCount(owner.openLeads)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right tabular-nums">
                    {formatCount(owner.staleLeads)}
                    {allStale ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        tots
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right">
                    <OldestTouch days={owner.oldestTouchDays} />
                  </TableCell>
                  <TableCell className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">
                    {owner.medianTouchDays === null
                      ? "—"
                      : formatCount(owner.medianTouchDays)}
                  </TableCell>
                  {stages.map((stage) => (
                    <TableCell
                      key={stage.name}
                      className="hidden px-3 py-3 text-right tabular-nums lg:table-cell"
                    >
                      {stage.count === 0 ? (
                        <span className="text-muted-foreground">0</span>
                      ) : (
                        formatCount(stage.count)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">
        «toc més antic» i «mediana» són dies des de l&apos;últim moviment del
        lead. les columnes per etapa només apareixen en pantalles amples.
      </p>
    </section>
  );
}

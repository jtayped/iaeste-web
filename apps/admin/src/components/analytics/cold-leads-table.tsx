import { ArrowUpRight, Snowflake } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/analytics/primitives";
import {
  formatCount,
  leadSubtitle,
  odooLeadUrl,
  ownerLabel,
  type CrmColdLead,
} from "@/lib/analytics";
import { ODOO_URL } from "@/lib/nav";

/**
 * The oldest untouched leads, each one a link straight into its odoo record.
 *
 * External links, so plain `<a target="_blank">` — the same treatment the
 * sidebar's `enllaços externs` get, and for the same reason: these are not
 * routes of this app and `<Link>` would prefetch them.
 */
export function ColdLeadsTable({ coldLeads }: { coldLeads: CrmColdLead[] }) {
  if (coldLeads.length === 0) {
    return (
      <section className="space-y-3">
        <SectionTitle>els més freds</SectionTitle>
        <EmptyState
          icon={Snowflake}
          title="cap lead esperant"
          description="cap lead obert porta 30 dies o més sense que ningú hi escrigui."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <SectionTitle>els més freds</SectionTitle>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">lead</TableHead>
              <TableHead className="hidden px-3 sm:table-cell">etapa</TableHead>
              <TableHead className="hidden px-3 md:table-cell">
                propietari
              </TableHead>
              <TableHead className="px-3 text-right">
                dies sense tocar
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coldLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="px-3 py-3">
                  <a
                    href={odooLeadUrl(ODOO_URL, lead.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start gap-1.5 rounded-sm font-medium ring-ring outline-none hover:text-secondary focus-visible:ring-2"
                  >
                    <span className="min-w-0">
                      {lead.name}
                      {leadSubtitle(lead.name, lead.company) ? (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {leadSubtitle(lead.name, lead.company)}
                        </span>
                      ) : null}
                    </span>
                    <ArrowUpRight
                      className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-secondary"
                      aria-hidden
                    />
                    <span className="sr-only">(s&apos;obre a odoo)</span>
                  </a>
                </TableCell>
                <TableCell className="hidden px-3 py-3 text-muted-foreground sm:table-cell">
                  {lead.stageName}
                </TableCell>
                <TableCell className="hidden px-3 py-3 text-muted-foreground md:table-cell">
                  {ownerLabel(lead.ownerName)}
                </TableCell>
                <TableCell className="px-3 py-3 text-right font-medium tabular-nums">
                  {formatCount(lead.daysSinceTouch)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        els leads oberts amb el toc més antic, els primers de la llista. cada
        nom obre la fitxa a odoo en una pestanya nova.
      </p>
    </section>
  );
}

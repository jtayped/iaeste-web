import { ChevronRight } from "lucide-react";

import { formatCount, type CrmTotals } from "@/lib/analytics";

/**
 * What this page deliberately does not show, and why.
 *
 * Every one of these would have been a tile: a revenue figure, a
 * lost-reasons breakdown, a real stage-transition funnel. Each is missing at
 * the source, and a `0 €` tile or an empty reasons panel would have claimed we
 * measured something and found nothing — which is a different, and false,
 * statement. Saying it here once, in plain words, is the honest version.
 *
 * Collapsed by default: it is a caveat, not a finding. `<details>` rather than
 * a toggle so it needs no client component and works before hydration.
 */
export function LimitsNote({ totals }: { totals: CrmTotals }) {
  return (
    <details className="group rounded-2xl border border-border px-4 py-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground marker:content-none sm:min-h-0">
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden
        />
        què no podem mesurar
      </summary>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">facturació.</span> el
          camp d&apos;import és buit a odoo per a tots els leads, així que no hi
          ha cap xifra d&apos;ingressos a ensenyar — ni tan sols un zero.
        </li>
        <li>
          <span className="font-medium text-foreground">motius de pèrdua.</span>{" "}
          ningú marca els leads com a perduts: el motiu és buit en{" "}
          {formatCount(totals.allLeads)} de {formatCount(totals.allLeads)}{" "}
          leads.
        </li>
        <li>
          <span className="font-medium text-foreground">
            historial d&apos;etapes.
          </span>{" "}
          els permisos d&apos;odoo no ens deixen llegir per on ha passat cada
          lead, així que l&apos;embut és una aproximació feta amb l&apos;etapa
          on és ara.
        </li>
      </ul>
    </details>
  );
}

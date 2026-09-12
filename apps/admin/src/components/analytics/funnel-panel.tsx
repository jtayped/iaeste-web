import { AnalyticsPanel, BarRow } from "@/components/analytics/primitives";
import {
  formatCount,
  formatPercent,
  type CrmAnalytics,
  type CrmFunnelStep,
} from "@/lib/analytics";

/**
 * Stages odoo has that our ladder does not. Rendered only when there are any:
 * an empty "cap etapa fora de l'escala" panel would imply we found nothing
 * where in fact there is nothing to find. When it *is* non-empty it matters,
 * because those leads are invisible to every bar above it.
 */
function UnclassifiedNote({
  stages,
}: {
  stages: CrmAnalytics["unclassifiedStages"];
}) {
  if (stages.length === 0) return null;
  const total = stages.reduce((sum, stage) => sum + stage.total, 0);
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {formatCount(total)} leads seuen en etapes que no formen part
      d&apos;aquesta escala ({stages.map((stage) => stage.name).join(", ")}) i
      no compten a cap pas.
    </p>
  );
}

/**
 * The stage ladder, drawn against its own first step.
 *
 * It is an approximation and says so: odoo will not give us stage-transition
 * history, so a lead counts at the stage it sits in today, not at every stage
 * it ever passed through. A lead that reached `negociant` and was archived is
 * invisible to every step after the one it stopped on.
 */
export function FunnelPanel({
  funnel,
  unclassifiedStages,
}: {
  funnel: CrmFunnelStep[];
  unclassifiedStages: CrmAnalytics["unclassifiedStages"];
}) {
  const max = funnel[0]?.reached ?? 0;

  return (
    <AnalyticsPanel
      title="embut"
      note="aproximació: odoo no ens deixa llegir l'historial d'etapes, així que cada lead compta a l'etapa on és ara."
    >
      {funnel.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          odoo no ens ha retornat cap etapa de l&apos;embut.
        </p>
      ) : (
        <ol className="space-y-4">
          {funnel.map((step, index) => (
            <li key={step.stageId}>
              <BarRow
                label={
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <span className="truncate">{step.name}</span>
                  </span>
                }
                value={step.reached}
                max={max}
                trailing={
                  step.stepRate === null ? null : (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatPercent(step.stepRate, 1)}
                    </span>
                  )
                }
              />
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        el percentatge és el pas des de l&apos;etapa anterior. no se
        n&apos;ensenya cap quan l&apos;etapa de partida té massa pocs leads
        perquè la xifra signifiqui res.
      </p>
      <UnclassifiedNote stages={unclassifiedStages} />
    </AnalyticsPanel>
  );
}

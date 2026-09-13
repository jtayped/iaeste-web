"use client";

import { AlertTriangle, Users } from "lucide-react";

import { Skeleton } from "@repo/ui/skeleton";

import type { BroadcastContent, BroadcastRecipients } from "@/lib/admin-types";
import { errorDetail, errorMessage } from "@/lib/api-error";
import { isTooManyRecipientsError } from "@/lib/broadcasts";

/**
 * The last screen before anything is sent.
 *
 * It states the exact number the API resolved — not the table's row count —
 * and names the people behind it, because "37" is not something anybody can
 * check and "Berta Puig, Marc Solé, …" is.
 */
export function ConfirmPanel({
  content,
  recipients,
  error,
}: {
  content: BroadcastContent;
  recipients: BroadcastRecipients | undefined;
  error: unknown;
}) {
  // Not `ErrorState`: the usual refusal here is a 409 about the selection
  // itself, and "no hem pogut parlar amb l'api" would send the operator to
  // look for an outage that is not happening.
  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="font-medium">
            {isTooManyRecipientsError(error)
              ? "la selecció arriba a massa gent"
              : "no s'ha pogut resoldre la selecció"}
          </p>
          <p className="text-sm break-words text-muted-foreground">
            {errorDetail(error) ?? errorMessage(error)}
          </p>
          <p className="text-sm text-muted-foreground">
            torna enrere, ajusta els filtres de la taula i prova-ho de nou.
          </p>
        </div>
      </div>
    );
  }

  if (!recipients) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const { total, sample, truncated } = recipients;
  const names = sample.map((person) =>
    `${person.name} ${person.surnames}`.trim(),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <Users className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-medium tabular-nums">
            {total === 1
              ? "1 persona rebrà aquest correu"
              : `${total} persones rebran aquest correu`}
          </p>
          <p className="text-sm text-muted-foreground">
            una còpia separada per persona, amb les seves dades. assumpte:{" "}
            <span className="font-medium">«{content.subject}»</span>
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          la selecció no arriba a cap adreça. torna enrere i revisa-la.
        </div>
      ) : (
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium">a qui</h3>
          <p className="text-sm break-words text-muted-foreground">
            {names.join(" · ")}
            {truncated || sample.length < total
              ? ` · i ${total - sample.length} més`
              : null}
          </p>
        </div>
      )}
    </div>
  );
}

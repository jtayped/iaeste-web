"use client";

import * as React from "react";
import { Eye, Send } from "lucide-react";

import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { toast } from "@repo/ui/toast";

import { ErrorState } from "@/components/error-state";
import type { BroadcastAudience, BroadcastContent } from "@/lib/admin-types";
import { errorMessage } from "@/lib/api-error";
import {
  isProviderRefusedError,
  useBroadcastPreview,
  useBroadcastTest,
} from "@/lib/broadcasts";
import { useDebouncedValue } from "@/lib/use-debounced-value";

/**
 * The preview *is* the email.
 *
 * `html` comes back from the API rendered by the same React Email component
 * the send uses, so what is framed here is the exact bytes that will be
 * delivered. It is shown in a fully sandboxed iframe (`sandbox=""`: no
 * scripts, no same-origin, no forms) because the document is email HTML with
 * its own `<style>`, and nothing about it should be able to touch the admin.
 */
export function PreviewPane({
  content,
  audience,
  enabled,
}: {
  content: BroadcastContent;
  /** Omitted when the audience is unresolved, so the API uses stand-ins. */
  audience: BroadcastAudience | undefined;
  /** False while the draft is invalid — an empty body renders nothing useful. */
  enabled: boolean;
}) {
  // The preview is a render on the API, so the *content* is debounced the same
  // way the table search boxes are: typing must not be one request per
  // keystroke. The audience is not — it changes when the operator changes the
  // selection, never while they type, and it is rebuilt fresh on every render,
  // so debouncing it would reschedule its own timer forever.
  const debounced = useDebouncedValue(content, 500);
  const preview = useBroadcastPreview(debounced, audience, enabled);
  const test = useBroadcastTest();

  const recipient = preview.data?.sampleRecipient;

  function sendTest() {
    test.mutate(content, {
      onSuccess: (result) => {
        toast.success(`prova enviada a ${result.sentTo}`, {
          description: "ningú més l'ha rebuda.",
        });
      },
      onError: (error) => {
        toast.error(
          isProviderRefusedError(error)
            ? "el proveïdor de correu ha rebutjat la prova"
            : errorMessage(error),
          { description: "no s'ha enviat res a ningú més." },
        );
      },
    });
  }

  return (
    <section className="space-y-3" aria-label="previsualització del correu">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Eye className="size-4 text-muted-foreground" aria-hidden />
          previsualització
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-9"
          disabled={!enabled || test.isPending}
          onClick={sendTest}
        >
          <Send className="size-4" aria-hidden />
          {test.isPending ? "enviant…" : "envia'm una prova"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {!enabled
          ? "escriu l'assumpte i el missatge i el veuràs aquí tal com arribarà."
          : recipient
            ? `personalitzat per a ${recipient.name} ${recipient.surnames} · ${recipient.email}`
            : "amb valors d'exemple: encara no hi ha ningú a la selecció."}
      </p>

      {preview.isError ? (
        <ErrorState detail={errorMessage(preview.error)} />
      ) : null}

      {enabled && !preview.isError ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          {preview.data ? (
            <iframe
              // Fully sandboxed: this is untrusted-by-construction email HTML.
              sandbox=""
              srcDoc={preview.data.html}
              title="el correu tal com arribarà"
              className="h-[55vh] min-h-80 w-full border-0 bg-white"
            />
          ) : (
            <Skeleton className="h-[55vh] min-h-80 w-full" />
          )}
        </div>
      ) : null}
    </section>
  );
}

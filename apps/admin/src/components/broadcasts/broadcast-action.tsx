"use client";

import * as React from "react";
import { Mail } from "lucide-react";

import { Button } from "@repo/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/drawer";
import { toast } from "@repo/ui/toast";

import { ComposeFields } from "@/components/broadcasts/compose-fields";
import { ConfirmPanel } from "@/components/broadcasts/confirm-panel";
import { PreviewPane } from "@/components/broadcasts/preview-pane";
import type { DataTableSelectionHandle } from "@/components/data-table/types";
import type {
  BroadcastAudience,
  BroadcastSendResponse,
} from "@/lib/admin-types";
import { errorDetail, errorMessage } from "@/lib/api-error";
import { useBroadcastDraft } from "@/lib/broadcast-draft";
import {
  isAudienceChangedError,
  useBroadcastRecipients,
  useSendBroadcast,
} from "@/lib/broadcasts";

/**
 * The broadcast composer, as a standard `<DataTable>` selection action.
 *
 * It is deliberately the same component on every table that can select people:
 * the only thing a call site supplies is the `audience` describing its own
 * selection and the `unit` it counts in. Compose → preview → confirm → send,
 * with the preview rendered by the API from the same template the send uses.
 */
export function BroadcastAction({
  audience,
  selection,
  unit,
}: {
  audience: BroadcastAudience;
  selection: DataTableSelectionHandle;
  /** Plural, lowercase Catalan: "sol·licituds", "membres", "invitacions". */
  unit: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"compose" | "confirm">("compose");
  const draft = useBroadcastDraft();
  const recipients = useBroadcastRecipients(audience, open);
  const send = useSendBroadcast();
  const total = recipients.data?.total;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setStep("compose");
  }

  function close() {
    handleOpenChange(false);
    draft.reset();
  }

  function report(result: BroadcastSendResponse) {
    const sent =
      result.sent === 1 ? "1 correu enviat" : `${result.sent} correus enviats`;

    if (result.failed.length === 0) {
      toast.success(sent);
      return;
    }
    // Named, not counted: a failed address is chased by hand, and a toast
    // that only says "2 han fallat" sends someone to the server logs.
    toast.warning(sent, {
      description: `${result.failed.length} ${
        result.failed.length === 1 ? "no ha arribat" : "no han arribat"
      }: ${result.failed.map((failure) => failure.email).join(", ")}`,
    });
  }

  function handleSend(total: number) {
    send.mutate(
      { audience, content: draft.content, expectedRecipients: total },
      {
        onSuccess: (result) => {
          report(result);
          close();
          selection.clear();
        },
        onError: (error) => {
          // The audience moved between the confirmation and the send, so the
          // API refused rather than reaching a different set of people. The
          // count is re-resolved and the operator confirms the new one.
          if (isAudienceChangedError(error)) {
            toast.error("la selecció ha canviat, revisa-la", {
              ...(errorDetail(error)
                ? { description: errorDetail(error) }
                : {}),
            });
            void recipients.refetch();
            return;
          }
          toast.error(errorMessage(error), {
            ...(errorDetail(error) ? { description: errorDetail(error) } : {}),
          });
        },
      },
    );
  }

  function handleContinue() {
    if (!draft.isValid) {
      draft.touchAll();
      return;
    }
    setStep("confirm");
  }

  return (
    <Drawer isOpen={open} onOpenChange={handleOpenChange}>
      {/* React Aria hands the trigger props to the first focusable child. */}
      <Button size="sm" variant="outline">
        <Mail className="size-4" aria-hidden />
        escriu un correu
      </Button>

      <DrawerContent className="w-full sm:max-w-3xl">
        <DrawerHeader>
          <DrawerTitle>escriu un correu</DrawerTitle>
          <DrawerDescription>
            {selection.count} {selection.count === 1 ? "fila" : "files"} de{" "}
            {unit}. cadascú en rep una còpia separada, mai un correu adreçat a
            tothom.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="mt-6">
          {step === "compose" ? (
            <div className="space-y-6 xl:grid xl:grid-cols-2 xl:gap-8 xl:space-y-0">
              <ComposeFields draft={draft} />
              <PreviewPane
                content={draft.content}
                // Without a resolved audience the API falls back to stand-in
                // values, which is also what happens while it is still loading
                // or has refused the selection as too large.
                audience={recipients.data ? audience : undefined}
                enabled={draft.isValid}
              />
            </div>
          ) : (
            <ConfirmPanel
              content={draft.content}
              recipients={recipients.data}
              error={recipients.error}
            />
          )}
        </DrawerBody>

        {/* Bottom-anchored on a phone, where the thumb is — and the send
            button is only ever reachable from the confirmation step. HeroUI's
            footer is a single row; it stacks below `sm` so two 44px targets
            fit at 360px. */}
        <DrawerFooter className="flex-col-reverse pt-4 sm:flex-row [&>*]:min-h-11 sm:[&>*]:min-h-9">
          {step === "compose" ? (
            <>
              <Button variant="outline" onClick={close}>
                cancel·la
              </Button>
              <Button onClick={handleContinue}>continua</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={send.isPending}
                onClick={() => setStep("compose")}
              >
                torna a escriure
              </Button>
              <Button
                disabled={
                  send.isPending ||
                  recipients.isFetching ||
                  total === undefined ||
                  total === 0
                }
                onClick={() => total !== undefined && handleSend(total)}
              >
                {send.isPending
                  ? "enviant…"
                  : total === undefined || total === 1
                    ? "envia el correu"
                    : `envia els ${total} correus`}
              </Button>
            </>
          )}
        </DrawerFooter>

        {/* Labelled here: React Aria ships no Catalan bundle. */}
        <DrawerClose aria-label="tanca" />
      </DrawerContent>
    </Drawer>
  );
}

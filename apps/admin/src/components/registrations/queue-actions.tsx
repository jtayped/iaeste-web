"use client";

import { Button } from "@repo/ui/button";

import { ConfirmAction } from "@/components/admin/confirm-action";
import type { AdminRegistration } from "@/lib/admin-types";
import { fullName } from "@/lib/admin-types";
import { useReviewAction } from "@/lib/registrations";

/**
 * Accept / reject / restore from the queue itself, so the common case — a
 * verified applicant with nothing surprising about them — does not need a trip
 * to the detail page and back.
 *
 * Which buttons exist follows the row's status; the API still answers 409 to
 * an illegal transition, so this only keeps the pointless button off the row.
 */
export function QueueRowActions({
  registration,
}: {
  registration: AdminRegistration;
}) {
  const action = useReviewAction();
  const { id, status } = registration;
  const name = fullName(registration.profileSnapshot);
  const pending = action.isPending;

  if (status === "pending_review") {
    return (
      <>
        <ConfirmAction
          trigger={
            <Button size="sm" disabled={pending}>
              accepta
            </Button>
          }
          title={`acceptar ${name}?`}
          description="passarà a ser membre de la campanya i rebrà un correu amb l'enllaç per entrar al panell."
          confirmLabel="accepta"
          pending={pending}
          onConfirm={() => action.mutate({ kind: "accept", id })}
        />
        <ConfirmAction
          trigger={
            <Button size="sm" variant="outline" disabled={pending}>
              rebutja
            </Button>
          }
          title={`rebutjar ${name}?`}
          description="rebrà un correu amb el motiu que escriguis aquí. es pot desfer des de la fitxa."
          confirmLabel="rebutja"
          destructive
          reason={{
            label: "motiu",
            placeholder: "no hi ha places disponibles aquest curs.",
            required: true,
          }}
          pending={pending}
          onConfirm={(reason) => action.mutate({ kind: "reject", id, reason })}
        />
      </>
    );
  }

  if (status === "rejected") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => action.mutate({ kind: "restore", id })}
      >
        torna a la cua
      </Button>
    );
  }

  return null;
}

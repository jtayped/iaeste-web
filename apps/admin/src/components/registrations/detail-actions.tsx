"use client";

import { Button } from "@repo/ui/button";

import { ActionBar } from "@/components/admin/detail-panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import type { AdminRegistration } from "@/lib/admin-types";
import { useReviewAction } from "@/lib/registrations";

/**
 * Accept / reject / restore for one registration.
 *
 * Which buttons exist is decided by the status, not by disabling them: the API
 * answers 409 for a transition that is not allowed from the current state, so
 * a greyed-out "accepta" on an already-accepted row would only be an
 * invitation to discover that.
 */
export function RegistrationActions({
  registration,
  name,
}: {
  registration: AdminRegistration;
  name: string;
}) {
  const action = useReviewAction();
  const { id, status } = registration;
  const pending = action.isPending;

  if (status === "pending_email") {
    return (
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        aquesta persona encara no ha verificat el correu. fins que no ho faci no
        es pot acceptar ni rebutjar.
      </p>
    );
  }

  return (
    <ActionBar>
      {status === "pending_review" ? (
        <>
          <ConfirmAction
            trigger={<Button disabled={pending}>accepta</Button>}
            title={`acceptar ${name}?`}
            description="passarà a ser membre de la campanya i rebrà un correu amb l'enllaç per entrar al dashboard."
            confirmLabel="accepta"
            pending={pending}
            onConfirm={() => action.mutate({ kind: "accept", id })}
          />
          <ConfirmAction
            trigger={
              <Button variant="outline" disabled={pending}>
                rebutja
              </Button>
            }
            title={`rebutjar ${name}?`}
            description="rebrà un correu amb el motiu que escriguis aquí. sempre es pot tornar a la cua després."
            confirmLabel="rebutja"
            destructive
            reason={{
              label: "motiu",
              placeholder: "no hi ha places disponibles aquest curs.",
              required: true,
            }}
            pending={pending}
            onConfirm={(reason) =>
              action.mutate({ kind: "reject", id, reason })
            }
          />
        </>
      ) : null}

      {status === "rejected" ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => action.mutate({ kind: "restore", id })}
        >
          torna a la cua de revisió
        </Button>
      ) : null}

      {status === "accepted" ? (
        <p className="text-sm text-muted-foreground">
          ja és membre. la baixa i l&apos;expulsió es fan des de la seva fitxa a
          «membres».
        </p>
      ) : null}
    </ActionBar>
  );
}

"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

import {
  ActionBar,
  Field,
  Panel,
  Section,
} from "@/components/admin/detail-panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { StatusBadge } from "@/components/admin/status-badge";
import type { AdminRegistration } from "@/lib/admin-types";
import { fullName } from "@/lib/admin-types";
import { formatDateTime } from "@/lib/format";
import { registrationStatus } from "@/lib/labels";
import { useMember } from "@/lib/members";
import { useReviewAction } from "@/lib/registrations";

/**
 * Who reviewed the sol·licitud.
 *
 * The registration only carries the reviewer's id, so the name is looked up
 * from the member endpoint. A reviewer who has since been deleted leaves the
 * link standing with its fallback label rather than blanking the row: the
 * decision still happened, and the id is the record of it.
 */
function Reviewer({ reviewerId }: { reviewerId: string }) {
  const { data } = useMember(reviewerId);

  return (
    <Link
      href={`/members/${reviewerId}`}
      className="font-medium text-secondary underline-offset-4 hover:underline"
    >
      {data ? fullName(data.profile) : "obre la fitxa de qui la va revisar"}
    </Link>
  );
}

/** The decision as it stands: outcome, when, who, and why if it was a refusal. */
function DecisionRecord({ registration }: { registration: AdminRegistration }) {
  return (
    <dl className="divide-y divide-border">
      <Field label="resultat">
        <StatusBadge status={registrationStatus(registration.status)} />
      </Field>
      <Field label="decidida el">
        {formatDateTime(registration.reviewedAt)}
      </Field>
      <Field label="qui la va revisar">
        {registration.reviewerId ? (
          <Reviewer reviewerId={registration.reviewerId} />
        ) : (
          "no consta"
        )}
      </Field>
      {registration.rejectionReason ? (
        <Field label="motiu del rebuig">{registration.rejectionReason}</Field>
      ) : null}
    </dl>
  );
}

/**
 * Accept / reject / restore for one registration, under the record of the
 * decision that has already been taken.
 *
 * Which buttons exist is decided by the status, not by disabling them: the API
 * answers 409 for a transition that is not allowed from the current state, so
 * a greyed-out "accepta" on an already-accepted row would only be an
 * invitation to discover that.
 */
export function RegistrationDecision({
  registration,
  name,
  existingUserId,
}: {
  registration: AdminRegistration;
  name: string;
  existingUserId: string | null;
}) {
  const action = useReviewAction();
  const { id, status } = registration;
  const pending = action.isPending;

  return (
    <Section
      title="decisió"
      description={
        status === "pending_review"
          ? "acceptar-la la dona d'alta com a membre de la campanya; rebutjar-la li envia el motiu que escriguis. totes dues es poden refer."
          : undefined
      }
    >
      <Panel className="divide-y divide-border">
        {registration.reviewedAt ? (
          <DecisionRecord registration={registration} />
        ) : null}

        <div className="space-y-3 p-4">
          {status === "pending_email" ? (
            <p className="max-w-[72ch] text-sm text-muted-foreground">
              aquesta persona encara no ha verificat el correu. fins que no ho
              faci no es pot acceptar ni rebutjar.
            </p>
          ) : null}

          {status === "accepted" ? (
            <p className="max-w-[72ch] text-sm text-muted-foreground">
              ja és membre. la baixa, l&apos;expulsió i el canvi de rol es fan
              des de la seva fitxa de membre.
            </p>
          ) : null}

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

            {existingUserId ? (
              <Link
                href={`/members/${existingUserId}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                obre la fitxa de membre
              </Link>
            ) : null}
          </ActionBar>
        </div>
      </Panel>
    </Section>
  );
}

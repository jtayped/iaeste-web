"use client";

import { MailPlus } from "lucide-react";

import { Button } from "@repo/ui/button";

import { ConfirmAction } from "@/components/admin/confirm-action";
import type { DataTableSelectionHandle } from "@/components/data-table/types";
import type { MemberSelectionQuery } from "@/lib/invitations";
import { useBulkCreateInvitations } from "@/lib/invitations";

export function BulkInviteAction({
  campaignId,
  campaignLabel,
  eligibleTotal,
  query,
  selection,
}: {
  campaignId: string;
  campaignLabel: string;
  /**
   * How many of the whole filtered list can still be invited. The selection
   * spans everyone — it also feeds the broadcast composer — so this is what
   * keeps the confirmation honest about who will actually receive one.
   */
  eligibleTotal: number;
  query: MemberSelectionQuery;
  selection: DataTableSelectionHandle;
}) {
  const invite = useBulkCreateInvitations();
  const count = selection.count;

  return (
    <ConfirmAction
      trigger={
        <Button size="sm" disabled={invite.isPending}>
          <MailPlus className="size-4" aria-hidden />
          convida&apos;n {count}
        </Button>
      }
      title={`convida ${count} ${count === 1 ? "persona" : "persones"}`}
      description={
        <>
          enviarem una invitació per entrar a la campanya {campaignLabel} a qui
          encara no hi tingui alta, inscripció ni invitació — ara mateix,{" "}
          {eligibleTotal} de la llista. la resta quedarà fora.
        </>
      }
      confirmLabel={invite.isPending ? "enviant…" : "envia les invitacions"}
      pending={invite.isPending}
      onConfirm={() =>
        invite.mutate(
          {
            campaignId,
            query,
            selection: selection.value,
          },
          { onSuccess: selection.clear },
        )
      }
    />
  );
}

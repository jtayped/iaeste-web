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
  query,
  selection,
}: {
  campaignId: string;
  campaignLabel: string;
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
          enviarem una invitació per entrar a la campanya {campaignLabel} a les
          adreces que consten a les fitxes seleccionades. les inscripcions i
          invitacions que hagin aparegut mentrestant quedaran fora.
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

"use client";

import { useRouter } from "next/navigation";

import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";

import { ActionBar, Section } from "@/components/admin/detail-panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import type { AdminMemberDetail, MemberRole } from "@/lib/admin-types";
import { fullName } from "@/lib/admin-types";
import { useDeleteMember, useMemberAction } from "@/lib/members";

/**
 * Which of leave/kick/restore is offered follows the member's *current*
 * membership, not their history: someone whose only active row has ended can
 * only be restored, and someone active cannot be restored. Illegal
 * transitions still 409 at the API — this only keeps the obviously wrong
 * button off the screen.
 */
export function MemberActions({ member }: { member: AdminMemberDetail }) {
  const action = useMemberAction();
  const deleteMember = useDeleteMember();
  const router = useRouter();
  const { profile } = member;
  const userId = profile.userId;
  const name = fullName(profile);
  const pending = action.isPending;

  const active = member.memberships.some(
    (membership) => membership.status === "active",
  );
  const role: MemberRole = profile.role === "admin" ? "admin" : "member";

  return (
    <div className="space-y-6">
      <Section title="rol">
        <div className="space-y-1.5">
          <Label
            htmlFor="member-role"
            className="text-xs text-muted-foreground"
          >
            què pot fer al dashboard
          </Label>
          <Select
            value={role}
            disabled={pending}
            onValueChange={(next) =>
              action.mutate({
                kind: "role",
                userId,
                role: next as MemberRole,
              })
            }
          >
            <SelectTrigger
              id="member-role"
              className="h-11 w-full sm:h-9 sm:w-64"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">membre</SelectItem>
              <SelectItem value="admin">administrador</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            un administrador pot revisar sol·licituds, gestionar membres i obrir
            i tancar campanyes.
          </p>
        </div>
      </Section>

      <Section title="alta i baixa">
        <ActionBar>
          {active ? (
            <>
              <ConfirmAction
                trigger={
                  <Button variant="outline" disabled={pending}>
                    dona de baixa
                  </Button>
                }
                title={`donar de baixa ${name}?`}
                description="marca que ha deixat el comitè per voluntat pròpia. manté el compte i l'historial, i es pot readmetre després."
                confirmLabel="dona de baixa"
                reason={{
                  label: "motiu (opcional)",
                  placeholder: "marxa d'erasmus el segon quadrimestre.",
                }}
                pending={pending}
                onConfirm={(reason) =>
                  action.mutate({
                    kind: "leave",
                    userId,
                    ...(reason ? { reason } : {}),
                  })
                }
              />
              <ConfirmAction
                trigger={
                  <Button variant="outline" disabled={pending}>
                    expulsa
                  </Button>
                }
                title={`expulsar ${name}?`}
                description="tanca totes les seves sessions immediatament i el treu del comitè. el motiu queda registrat a l'historial."
                confirmLabel="expulsa"
                destructive
                reason={{
                  label: "motiu",
                  placeholder: "incompliment reiterat del codi de conducta.",
                  required: true,
                }}
                pending={pending}
                onConfirm={(reason) =>
                  action.mutate({ kind: "kick", userId, reason })
                }
              />
            </>
          ) : (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => action.mutate({ kind: "restore", userId })}
            >
              readmet al comitè
            </Button>
          )}
        </ActionBar>
      </Section>

      <Section
        title="elimina definitivament"
        className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
      >
        <p className="text-xs text-muted-foreground">
          esborra el compte, el perfil, totes les altes i baixes, l&apos;historial
          d&apos;activitat, les sol·licituds fetes amb aquest correu i les
          invitacions que ha enviat. no és donar de baixa: no es pot desfer i no
          en queda cap rastre. fes-ho només si la persona ho demana o hi ha una
          obligació legal.
        </p>
        <ActionBar>
          <ConfirmAction
            trigger={
              <Button
                variant="destructive"
                disabled={pending || deleteMember.isPending}
              >
                elimina definitivament
              </Button>
            }
            title={`eliminar ${name} per sempre?`}
            description={`s'esborraran el compte de ${name} i totes les dades relacionades (perfil, historial, sol·licituds i invitacions) de manera irreversible. no és el mateix que donar de baixa, que manté l'historial i permet readmetre la persona.`}
            confirmLabel="elimina definitivament"
            destructive
            pending={deleteMember.isPending}
            onConfirm={() =>
              deleteMember.mutate(userId, {
                onSuccess: () => router.push("/members"),
              })
            }
          />
        </ActionBar>
      </Section>
    </div>
  );
}

"use client";

import * as React from "react";
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

import {
  ActionBar,
  ActionRow,
  Panel,
  Section,
} from "@/components/admin/detail-panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import type { AdminMemberDetail, MemberRole } from "@/lib/admin-types";
import { fullName } from "@/lib/admin-types";
import { useDeleteMember, useMemberAction } from "@/lib/members";

/**
 * The role select never applies on change.
 *
 * Moving someone to `administrador` hands them the review queue, the member
 * actions and the campaign switches, and a dropdown that grants that the
 * instant the pointer leaves it is indistinguishable from a misclick. The
 * select is a draft, the button is the commitment, and the promotion is
 * confirmed on top.
 */
function RoleSection({
  userId,
  name,
  current,
}: {
  userId: string;
  name: string;
  current: MemberRole;
}) {
  const action = useMemberAction();
  const [role, setRole] = React.useState<MemberRole>(current);
  const pending = action.isPending;
  const changed = role !== current;

  // Follows the record once the save lands, and after a role changed from
  // somewhere else — otherwise the select keeps offering a save for a change
  // that already happened.
  React.useEffect(() => {
    setRole(current);
  }, [current]);

  const save = () => action.mutate({ kind: "role", userId, role });
  const saveLabel = pending ? "desant…" : "desa el rol";

  return (
    <Section
      title="rol"
      description="què pot fer aquesta persona al dashboard. el canvi no s'aplica fins que no el deses."
    >
      <Panel className="space-y-3 p-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="member-role"
            className="text-xs text-muted-foreground"
          >
            rol
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={role}
              disabled={pending}
              onValueChange={(next) => setRole(next as MemberRole)}
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
            <ActionBar className="sm:shrink-0">
              {role === "admin" ? (
                <ConfirmAction
                  trigger={
                    <Button disabled={pending || !changed}>{saveLabel}</Button>
                  }
                  title={`donar accés d'administrador a ${name}?`}
                  description="podrà revisar i acceptar sol·licituds, donar de baixa i expulsar membres, obrir i tancar campanyes i canviar el rol de qualsevol altra persona, el teu inclòs."
                  confirmLabel="dona accés d'administrador"
                  pending={pending}
                  onConfirm={save}
                />
              ) : (
                <Button disabled={pending || !changed} onClick={save}>
                  {saveLabel}
                </Button>
              )}
            </ActionBar>
          </div>
        </div>
        <p className="max-w-[72ch] text-xs text-muted-foreground">
          un administrador pot revisar sol·licituds, gestionar membres i obrir i
          tancar campanyes. un membre només veu el seu propi perfil.
        </p>
      </Panel>
    </Section>
  );
}

/**
 * Which of leave/kick/restore is offered follows the member's *current*
 * membership, not their history: someone whose only active row has ended can
 * only be restored, and someone active cannot be restored. Illegal
 * transitions still 409 at the API — this only keeps the obviously wrong
 * button off the screen.
 */
function MembershipSection({
  userId,
  name,
  active,
}: {
  userId: string;
  name: string;
  active: boolean;
}) {
  const action = useMemberAction();
  const pending = action.isPending;

  return (
    <Section
      title="alta i baixa"
      description="totes dues accions es poden desfer readmetent la persona: mantenen el compte, els correus i l'historial."
    >
      <Panel className="divide-y divide-border">
        {active ? (
          <>
            <ActionRow
              title="dona de baixa"
              note="per a qui deixa el comitè per voluntat pròpia. deixa de ser membre de la campanya actual i es pot readmetre quan torni. no tanca cap sessió ni avisa ningú."
            >
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
            </ActionRow>
            <ActionRow
              title="expulsa"
              note="és una sanció: li tanca totes les sessions a l'instant i exigeix un motiu, que queda escrit a l'historial per sempre. la persona es pot readmetre, però el motiu no s'esborra."
            >
              <ConfirmAction
                trigger={
                  <Button variant="destructive" disabled={pending}>
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
            </ActionRow>
          </>
        ) : (
          <ActionRow
            title="readmet al comitè"
            note="torna a donar d'alta la persona a la campanya actual, tant si havia marxat com si va ser expulsada. l'historial anterior es manté tal com és."
          >
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => action.mutate({ kind: "restore", userId })}
            >
              readmet al comitè
            </Button>
          </ActionRow>
        )}
      </Panel>
    </Section>
  );
}

export function MemberActions({ member }: { member: AdminMemberDetail }) {
  const deleteMember = useDeleteMember();
  const router = useRouter();
  const { profile } = member;
  const userId = profile.userId;
  const name = fullName(profile);

  const active = member.memberships.some(
    (membership) => membership.status === "active",
  );
  const role: MemberRole = profile.role === "admin" ? "admin" : "member";

  return (
    <div className="space-y-6 md:space-y-8">
      <RoleSection userId={userId} name={name} current={role} />

      <MembershipSection userId={userId} name={name} active={active} />

      <Section
        title="elimina definitivament"
        description="esborra el compte, el perfil, totes les altes i baixes, l'historial d'activitat, les sol·licituds fetes amb aquest correu i les invitacions que ha enviat. no és donar de baixa: no es pot desfer i no en queda cap rastre. fes-ho només si la persona ho demana o hi ha una obligació legal."
        className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
      >
        <ActionBar>
          <ConfirmAction
            trigger={
              <Button variant="destructive" disabled={deleteMember.isPending}>
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

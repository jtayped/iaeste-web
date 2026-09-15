"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/drawer";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";

import type { CampaignOption } from "@/components/admin/campaign-picker";
import {
  DuplicateInviteNotice,
  ExternalDomainConfirm,
  GrantAdminDeniedNotice,
} from "@/components/invitations/invite-notices";
import type { InvitationRole } from "@/lib/admin-types";
import { isUdlEmail, useCreateInvitation } from "@/lib/invitations";

type Notice =
  | { kind: "none" }
  | { kind: "external" }
  | { kind: "duplicate"; detail: string }
  | { kind: "forbiddenAdmin"; detail: string };

const EMPTY = { email: "", name: "", surnames: "" };

/**
 * The invite form.
 *
 * The interesting part is the external-domain step: a non-`udl.cat` address is
 * caught here and turned into an explicit "convida igualment", which is what
 * sets `allowExternalDomain`. The API's own 409 is handled too, as the
 * backstop for anything the client-side check gets wrong.
 */
export function InviteForm({
  campaigns,
  defaultCampaignId,
}: {
  campaigns: readonly CampaignOption[];
  defaultCampaignId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [fields, setFields] = React.useState(EMPTY);
  const [campaignId, setCampaignId] = React.useState(defaultCampaignId);
  const [role, setRole] = React.useState<InvitationRole>("member");
  const [notice, setNotice] = React.useState<Notice>({ kind: "none" });
  const [emailError, setEmailError] = React.useState<string | undefined>();
  const isMobile = useIsMobile();

  const create = useCreateInvitation();
  const email = fields.email.trim().toLowerCase();

  function reset() {
    setFields(EMPTY);
    setRole("member");
    setNotice({ kind: "none" });
    setEmailError(undefined);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function send(allowExternalDomain: boolean) {
    create.mutate(
      {
        campaignId,
        email,
        intendedRole: role,
        ...(fields.name.trim() ? { prefillName: fields.name.trim() } : {}),
        ...(fields.surnames.trim()
          ? { prefillSurnames: fields.surnames.trim() }
          : {}),
        ...(allowExternalDomain ? { allowExternalDomain: true } : {}),
      },
      {
        onSuccess: (outcome) => {
          if (outcome.kind === "created") {
            handleOpenChange(false);
            return;
          }
          if (outcome.kind === "needsExternalConfirm") {
            setNotice({ kind: "external" });
            return;
          }
          setNotice(outcome);
        },
      },
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice({ kind: "none" });

    if (!email.includes("@") || email.length < 3) {
      setEmailError("escriu una adreça de correu vàlida");
      return;
    }
    setEmailError(undefined);

    if (!isUdlEmail(email)) {
      setNotice({ kind: "external" });
      return;
    }

    send(false);
  }

  const pending = create.isPending;

  const trigger = (
    // The button is the trigger: React Aria hands it the trigger props
    // through context, so it needs no wrapper of its own.
    <Button size="sm" className="w-full sm:w-auto">
      <Plus className="size-4" aria-hidden />
      convida algú
    </Button>
  );

  const title = "convida algú";
  const description =
    "rebrà un correu amb un enllaç per entrar al comitè sense passar pel formulari públic.";

  const form = (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        {/* The one field that has to be filled in is the one that is marked.
            The other two used to be the ones carrying a note, which told you
            about the fields you can ignore and nothing about the one you
            cannot. */}
        <Label htmlFor="invite-email">
          correu{" "}
          <span className="text-destructive" aria-hidden>
            *
          </span>
          <span className="sr-only">(obligatori)</span>
        </Label>
        <Input
          id="invite-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          className="h-11 sm:h-9"
          // Not a udl.cat address: half the existing invitations are to
          // gmail accounts, and a domain in the placeholder reads as a
          // rule about which addresses are allowed.
          placeholder="nom@exemple.com"
          value={fields.email}
          aria-invalid={emailError !== undefined}
          onChange={(event) => {
            setFields((current) => ({
              ...current,
              email: event.target.value,
            }));
            setNotice({ kind: "none" });
          }}
        />
        {emailError ? (
          <p className="text-sm text-destructive">{emailError}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="invite-name">nom</Label>
          <Input
            id="invite-name"
            className="h-11 sm:h-9"
            value={fields.name}
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-surnames">cognoms</Label>
          <Input
            id="invite-surnames"
            className="h-11 sm:h-9"
            value={fields.surnames}
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                surnames: event.target.value,
              }))
            }
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        si els omples, el formulari els arribarà emplenats. sempre els podran
        corregir.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="invite-campaign">campanya</Label>
        <Select value={campaignId} onValueChange={setCampaignId}>
          <SelectTrigger id="invite-campaign" className="h-11 sm:h-9">
            <SelectValue placeholder="tria una campanya" />
          </SelectTrigger>
          <SelectContent>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.label}
                {campaign.isCurrent === true ? " · actual" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-role">rol</Label>
        <Select
          value={role}
          onValueChange={(next) => {
            setRole(next as InvitationRole);
            setNotice({ kind: "none" });
          }}
        >
          <SelectTrigger id="invite-role" className="h-11 sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">membre</SelectItem>
            <SelectItem value="admin">administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {notice.kind === "external" ? (
        <ExternalDomainConfirm
          email={email}
          pending={pending}
          onConfirm={() => send(true)}
        />
      ) : null}
      {notice.kind === "duplicate" ? (
        <DuplicateInviteNotice detail={notice.detail} />
      ) : null}
      {notice.kind === "forbiddenAdmin" ? (
        <GrantAdminDeniedNotice detail={notice.detail} />
      ) : null}

      {/* Send is rendered last and reads first, so a keyboard pass
                reaches cancel before it rather than jumping past it. */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:min-h-11 sm:[&>*]:min-h-9">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOpenChange(false)}
        >
          cancel·la
        </Button>
        <Button type="submit" disabled={pending || campaignId.length === 0}>
          {pending ? "enviant…" : "envia la invitació"}
        </Button>
      </div>
    </form>
  );

  // Four fields do not need a panel the height of the screen. On a phone the
  // sheet is still the right shape — it is the full width of the screen and
  // the thumb is at the bottom — so the two live side by side rather than one
  // replacing the other.
  if (isMobile) {
    return (
      <Drawer isOpen={open} onOpenChange={handleOpenChange}>
        {trigger}
        <DrawerContent className="w-full sm:max-w-lg">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          {/* The form lives in the body: that is the part React Aria leaves
              scrollable and keeps out of the drag-to-dismiss. */}
          <DrawerBody className="mt-6">{form}</DrawerBody>
          {/* Labelled here, not in the shared component: React Aria ships no
              Catalan bundle, so its default close label falls back to English. */}
          <DrawerClose aria-label="tanca" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog isOpen={open} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogBody className="mt-6">{form}</DialogBody>
        <DialogClose aria-label="tanca" />
      </DialogContent>
    </Dialog>
  );
}

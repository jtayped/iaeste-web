"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { TextField } from "@repo/ui/text-field";

import type { AdminMemberEmails } from "@/lib/admin-types";
import { useSetMemberEmails } from "@/lib/members";

/**
 * "Looks like an email" and nothing more.
 *
 * Deliberately not a domain check: the university/personal split is a label
 * here, not a rule, so `@udl.cat` is neither required in one slot nor refused
 * in the other. The API validates the format again and owns global uniqueness.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Slot = "university" | "personal";

function malformed(value: string): boolean {
  return value.length > 0 && !EMAIL_SHAPE.test(value);
}

/**
 * Edit both of a member's addresses in one dialog.
 *
 * The two inputs are prefilled from the current pair and always submitted
 * together — an emptied input clears its slot. The one state the form refuses
 * is *both* empty, because a member with no address can no longer be reached
 * or sign in; the API returns 409 for the same case, but the button is
 * disabled long before anyone can send it.
 *
 * Saving here is an admin vouching for the address: it comes back verified, so
 * the dialog promises no confirmation mail and offers no way to resend one.
 */
export function EditMemberEmailsDialog({
  userId,
  name,
  emails,
}: {
  userId: string;
  name: string;
  emails: AdminMemberEmails;
}) {
  const [open, setOpen] = React.useState(false);
  const [university, setUniversity] = React.useState("");
  const [personal, setPersonal] = React.useState("");
  const [touched, setTouched] = React.useState<Record<Slot, boolean>>({
    university: false,
    personal: false,
  });

  const setEmails = useSetMemberEmails();
  const pending = setEmails.isPending;

  const universityValue = university.trim();
  const personalValue = personal.trim();
  const bothEmpty = universityValue.length === 0 && personalValue.length === 0;
  const sameAddress =
    universityValue.length > 0 &&
    personalValue.length > 0 &&
    universityValue.toLowerCase() === personalValue.toLowerCase();

  function handleOpenChange(next: boolean) {
    if (!next && pending) return;
    setOpen(next);
    // Prefilled on the way *in* rather than from an initial state, so a dialog
    // reopened after a save shows what was saved and not what was typed last.
    if (next) {
      setUniversity(emails.university?.email ?? "");
      setPersonal(emails.personal?.email ?? "");
      setTouched({ university: false, personal: false });
    }
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ university: true, personal: true });

    if (bothEmpty || sameAddress) return;
    if (malformed(universityValue) || malformed(personalValue)) return;

    setEmails.mutate(
      {
        userId,
        university: universityValue.length > 0 ? universityValue : null,
        personal: personalValue.length > 0 ? personalValue : null,
      },
      // Only on success: a rejected address (already used by another account)
      // has to stay on screen to be corrected, and the hook has toasted why.
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <AlertDialog isOpen={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 sm:min-h-9"
      >
        edita
      </Button>
      <AlertDialogContent>
        <form className="contents" onSubmit={handleSave} noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>correus de {name}</AlertDialogTitle>
            <AlertDialogDescription>
              deixa un camp buit per eliminar aquella adreça. les adreces que
              desis quedaran verificades directament. no s&apos;enviarà cap
              correu de confirmació.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogBody className="space-y-4">
            <EmailInput
              slot="university"
              label="correu universitari"
              placeholder="nom.cognom@udl.cat"
              value={university}
              onChange={setUniversity}
              showError={touched.university && malformed(universityValue)}
              onBlur={() =>
                setTouched((current) => ({ ...current, university: true }))
              }
            />
            <EmailInput
              slot="personal"
              label="correu personal"
              placeholder="nom.cognom@gmail.com"
              value={personal}
              onChange={setPersonal}
              showError={touched.personal && malformed(personalValue)}
              onBlur={() =>
                setTouched((current) => ({ ...current, personal: true }))
              }
            />
            {bothEmpty ? (
              <p className="text-sm text-destructive" aria-live="polite">
                cal deixar-hi com a mínim una adreça. un membre sense correu no
                pot entrar ni rebre missatges.
              </p>
            ) : null}
            {sameAddress ? (
              <p className="text-sm text-destructive" aria-live="polite">
                el correu universitari i el personal han de ser diferents.
              </p>
            ) : null}
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button
              type="button"
              slot="close"
              variant="outline"
              disabled={pending}
              className="min-h-11 sm:min-h-9"
            >
              cancel·la
            </Button>
            <Button
              type="submit"
              disabled={pending || bothEmpty || sameAddress}
              className="min-h-11 sm:min-h-9"
            >
              {pending ? "desant…" : "desa"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EmailInput({
  slot,
  label,
  placeholder,
  value,
  onChange,
  showError,
  onBlur,
}: {
  slot: Slot;
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  showError: boolean;
  onBlur: () => void;
}) {
  const errorId = `member-email-${slot}-error`;

  return (
    <TextField
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isInvalid={showError}
      type="email"
    >
      <Label>{label}</Label>
      <Input
        name={slot}
        inputMode="email"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-describedby={showError ? errorId : undefined}
        className="h-11 sm:h-9"
      />
      {showError ? (
        <p id={errorId} className="text-sm text-destructive">
          escriu una adreça de correu vàlida, o deixa el camp buit per
          treure-la.
        </p>
      ) : null}
    </TextField>
  );
}

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
import { Label } from "@repo/ui/label";
import { TextField } from "@repo/ui/text-field";
import { Textarea } from "@repo/ui/textarea";

export interface ConfirmReasonField {
  label: string;
  placeholder?: string;
  /** A reason the API rejects as empty — reject and kick both require one. */
  required?: boolean;
}

export interface ConfirmActionProps {
  /** The button that opens the dialog. */
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Present when the action needs a written reason before it can run. */
  reason?: ConfirmReasonField;
  pending?: boolean;
  onConfirm: (reason: string) => void;
}

/**
 * The confirmation step in front of every irreversible admin action.
 *
 * It owns the reason field too, because the three actions that need one
 * (reject, kick, leave) all need it *inside* the confirmation rather than on
 * the page — asking for a reason and then asking "are you sure" is two
 * dialogs for one decision.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  destructive = false,
  reason,
  pending = false,
  onConfirm,
}: ConfirmActionProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const missing =
    reason?.required === true && value.trim().length === 0 && touched;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setValue("");
      setTouched(false);
    }
  }

  function handleConfirm() {
    setTouched(true);

    // An empty required reason would fire a request the API is certain to
    // reject, so the dialog stays open and the field is marked instead.
    if (reason?.required === true && value.trim().length === 0) return;

    onConfirm(value.trim());
    handleOpenChange(false);
  }

  return (
    <AlertDialog isOpen={open} onOpenChange={handleOpenChange}>
      {trigger}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {reason ? (
          <AlertDialogBody>
            <TextField
              value={value}
              onChange={setValue}
              isInvalid={missing}
              isRequired={reason.required}
            >
              <Label>{reason.label}</Label>
              <Textarea rows={3} placeholder={reason.placeholder ?? ""} />
              {missing ? (
                <p className="text-sm text-destructive">
                  cal escriure un motiu abans de continuar.
                </p>
              ) : null}
            </TextField>
          </AlertDialogBody>
        ) : null}

        <AlertDialogFooter>
          <Button
            slot="close"
            variant="outline"
            className="min-h-11 sm:min-h-9"
          >
            cancel·la
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={handleConfirm}
            className="min-h-11 sm:min-h-9"
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

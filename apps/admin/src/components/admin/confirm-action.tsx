"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/alert-dialog";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { cn } from "@repo/ui/lib/utils";

export interface ConfirmReasonField {
  label: string;
  placeholder?: string;
  /** A reason the API rejects as empty — reject and kick both require one. */
  required?: boolean;
}

export interface ConfirmActionProps {
  /** The button that opens the dialog. Rendered through `asChild`. */
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

  function handleConfirm(event: React.MouseEvent) {
    setTouched(true);

    // Radix closes the dialog on any action click. An empty required reason
    // would therefore fire a request the API is certain to reject, so the
    // close is cancelled and the field is marked instead.
    if (reason?.required === true && value.trim().length === 0) {
      event.preventDefault();
      return;
    }

    onConfirm(value.trim());
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {reason ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-reason">{reason.label}</Label>
            <Textarea
              id="confirm-reason"
              rows={3}
              value={value}
              placeholder={reason.placeholder ?? ""}
              aria-invalid={missing}
              onChange={(event) => setValue(event.target.value)}
            />
            {missing ? (
              <p className="text-sm text-destructive">
                cal escriure un motiu abans de continuar.
              </p>
            ) : null}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 sm:min-h-9">
            cancel·la
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={handleConfirm}
            className={cn(
              "min-h-11 sm:min-h-9",
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : null,
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

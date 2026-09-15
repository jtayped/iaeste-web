"use client";

import * as React from "react";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

export interface FormCardProps {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Puts the fields back to the last saved values. */
  onReset: () => void;
  /** Whether the fields differ from what is saved. Both actions hang off it. */
  dirty: boolean;
  pending?: boolean;
  submitLabel: string;
  /** Shown on the submit button while `pending`. Falls back to `submitLabel`. */
  pendingLabel?: string;
  resetLabel: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A form inside a card, with its actions pinned to a footer bar.
 *
 * Three rules it exists to keep identical across the app, because the profile
 * screen was the only place that had all three:
 *
 * 1. **Save is disabled until something changed.** An always-enabled save
 *    button on a long form says nothing about whether there is anything to
 *    save, and invites a no-op round trip.
 * 2. **Reset sits beside it**, so abandoning an edit does not mean reloading
 *    the page and losing the rest of it.
 * 3. **The actions live in a footer bar**, not loose under the last field —
 *    the same place on every form, whatever its length.
 *
 * Save is rendered last and reads first: the footer reverses on a phone and
 * flows normally from `sm` up, so the primary action is top / right in both
 * while a keyboard tab reaches reset before save rather than jumping past it.
 *
 * Labels are always passed in — this package has no opinion about which
 * language the product speaks.
 */
export function FormCard({
  onSubmit,
  onReset,
  dirty,
  pending = false,
  submitLabel,
  pendingLabel,
  resetLabel,
  className,
  children,
}: FormCardProps) {
  return (
    <Card className={cn("rounded-lg border-border p-0 shadow-none", className)}>
      <form onSubmit={onSubmit} noValidate>
        <div className="space-y-5 p-4 sm:p-5">{children}</div>

        <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end sm:p-5 [&>*]:min-h-11 sm:[&>*]:min-h-9">
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || pending}
            onClick={onReset}
          >
            {resetLabel}
          </Button>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? (pendingLabel ?? submitLabel) : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

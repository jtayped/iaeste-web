"use client";

import * as React from "react";
import { X } from "lucide-react";

import {
  BROADCAST_BODY_MAX,
  BROADCAST_CTA_LABEL_MAX,
  BROADCAST_HEADING_MAX,
  BROADCAST_SUBJECT_MAX,
} from "@repo/constants/validators/broadcast";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";

import type { BroadcastDraft, BroadcastField } from "@/lib/broadcast-draft";
import { PLACEHOLDER_HINTS } from "@/lib/broadcast-draft";

const CONTROL = "h-11 sm:h-9";

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

/**
 * The three variables a broadcast may use, stated once where they are typed.
 * Dismissible because it is a reminder, not a warning — but it comes back with
 * the next composer, since the next message is usually written by someone
 * else.
 */
function PlaceholderHint() {
  const [shown, setShown] = React.useState(true);
  if (!shown) return null;

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-3">
      <p className="min-w-0 flex-1 text-xs text-muted-foreground">
        pots escriure{" "}
        {PLACEHOLDER_HINTS.map((hint, index) => (
          <React.Fragment key={hint}>
            {index > 0 ? ", " : null}
            <code className="rounded bg-background px-1 py-0.5 font-mono">
              {hint}
            </code>
          </React.Fragment>
        ))}{" "}
        a l&apos;assumpte, al títol, al missatge i al botó. cada persona rebrà
        les seves dades. no n&apos;hi ha cap altra.
      </p>
      <Button
        variant="ghost"
        size="icon"
        aria-label="amaga l'ajuda de les variables"
        className="size-11 shrink-0 sm:size-8"
        onClick={() => setShown(false)}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

/**
 * The message itself. Every control is bound to `draft`, which validates with
 * the shared schema on each keystroke and only *shows* a message once the
 * operator has left the field — so a composer that has just opened is not
 * already red.
 */
export function ComposeFields({ draft }: { draft: BroadcastDraft }) {
  const { fields, visibleErrors } = draft;

  const bind = (field: BroadcastField) => ({
    onBlur: () => draft.touch(field),
    "aria-invalid": visibleErrors[field] !== undefined,
  });

  return (
    <div className="space-y-5">
      <PlaceholderHint />

      <div className="space-y-1.5">
        <Label htmlFor="broadcast-subject">assumpte</Label>
        <Input
          id="broadcast-subject"
          className={CONTROL}
          maxLength={BROADCAST_SUBJECT_MAX}
          placeholder="assemblea general · 3 d'octubre"
          value={fields.subject}
          onChange={(event) => draft.setField("subject", event.target.value)}
          {...bind("subject")}
        />
        <FieldError message={visibleErrors.subject} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="broadcast-heading">
          títol dins del correu (opcional)
        </Label>
        <Input
          id="broadcast-heading"
          className={CONTROL}
          maxLength={BROADCAST_HEADING_MAX}
          placeholder="si el deixes buit, s'hi posa l'assumpte"
          value={fields.heading}
          onChange={(event) => draft.setField("heading", event.target.value)}
          {...bind("heading")}
        />
        <FieldError message={visibleErrors.heading} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="broadcast-body">missatge</Label>
        <Textarea
          id="broadcast-body"
          rows={10}
          maxLength={BROADCAST_BODY_MAX}
          placeholder={
            "hola {{nom}},\n\nens veiem **dijous** a les 18:00 a l'aula 1.03. porta la targeta d'estudiant."
          }
          value={fields.body}
          onChange={(event) => draft.setField("body", event.target.value)}
          {...bind("body")}
        />
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-xs text-muted-foreground">
            format markdown: **negreta**, *cursiva*, [text](https://…), llistes
            amb «-» i cites amb «&gt;».
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {fields.body.length}/{BROADCAST_BODY_MAX}
          </p>
        </div>
        <FieldError message={visibleErrors.body} />
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-border p-3">
        <legend className="px-1 text-sm font-medium">botó (opcional)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-cta-label">text del botó</Label>
            <Input
              id="broadcast-cta-label"
              className={CONTROL}
              maxLength={BROADCAST_CTA_LABEL_MAX}
              placeholder="apunta-t'hi"
              value={fields.ctaLabel}
              onChange={(event) =>
                draft.setField("ctaLabel", event.target.value)
              }
              {...bind("ctaLabel")}
            />
            <FieldError message={visibleErrors.ctaLabel} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-cta-href">enllaç</Label>
            <Input
              id="broadcast-cta-href"
              type="url"
              inputMode="url"
              className={CONTROL}
              placeholder="https://iaestelleida.cat/…"
              value={fields.ctaHref}
              onChange={(event) =>
                draft.setField("ctaHref", event.target.value)
              }
              {...bind("ctaHref")}
            />
            <FieldError message={visibleErrors.ctaHref} />
          </div>
        </div>
      </fieldset>
    </div>
  );
}

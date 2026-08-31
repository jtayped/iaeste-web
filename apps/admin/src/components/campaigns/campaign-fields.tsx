"use client";

import { DatePicker } from "@repo/ui/date-picker";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

import type {
  CampaignFormErrors,
  CampaignFormState,
} from "@/lib/campaign-form";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

function DateField({
  id,
  label,
  hint,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: Date | undefined;
  error?: string;
  onChange: (date: Date | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <DatePicker
        id={id}
        className="h-11 sm:h-9"
        value={value}
        onChange={onChange}
        aria-invalid={error !== undefined}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError {...(error ? { message: error } : {})} />
    </div>
  );
}

/**
 * The six campaign fields, shared by the create sheet and the edit panel.
 *
 * `slug` is only editable while the campaign is a draft — once it is published
 * the slug is in the sheet tab name and in every link that has been shared, so
 * the API refuses to move it. The input says so rather than silently
 * discarding the edit.
 */
export function CampaignFields({
  state,
  errors,
  slugEditable,
  onChange,
}: {
  state: CampaignFormState;
  errors: CampaignFormErrors;
  slugEditable: boolean;
  onChange: (patch: Partial<CampaignFormState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="campaign-label">nom</Label>
        <Input
          id="campaign-label"
          className="h-11 sm:h-9"
          placeholder="curs 2026-2027"
          value={state.label}
          aria-invalid={errors.label !== undefined}
          onChange={(event) => onChange({ label: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          com surt escrit a tot arreu: al dashboard, als correus i al formulari.
        </p>
        <FieldError {...(errors.label ? { message: errors.label } : {})} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="campaign-slug">identificador</Label>
        <Input
          id="campaign-slug"
          className="h-11 font-mono sm:h-9"
          placeholder="2026-2027"
          value={state.slug}
          disabled={!slugEditable}
          aria-invalid={errors.slug !== undefined}
          onChange={(event) =>
            onChange({ slug: event.target.value.toLowerCase() })
          }
        />
        <p className="text-xs text-muted-foreground">
          {slugEditable
            ? "només minúscules, xifres i guions. no es podrà canviar un cop publicada."
            : "l'identificador només es pot canviar mentre la campanya és un esborrany."}
        </p>
        <FieldError {...(errors.slug ? { message: errors.slug } : {})} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          id="campaign-membership-starts"
          label="l'equip comença"
          value={state.membershipStartsAt}
          {...(errors.membershipStartsAt
            ? { error: errors.membershipStartsAt }
            : {})}
          onChange={(date) => onChange({ membershipStartsAt: date })}
        />
        <DateField
          id="campaign-membership-ends"
          label="l'equip acaba"
          value={state.membershipEndsAt}
          {...(errors.membershipEndsAt
            ? { error: errors.membershipEndsAt }
            : {})}
          onChange={(date) => onChange({ membershipEndsAt: date })}
        />
        <DateField
          id="campaign-registration-opens"
          label="s'obren les inscripcions"
          value={state.registrationOpensAt}
          {...(errors.registrationOpensAt
            ? { error: errors.registrationOpensAt }
            : {})}
          onChange={(date) => onChange({ registrationOpensAt: date })}
        />
        <DateField
          id="campaign-registration-closes"
          label="es tanquen les inscripcions"
          hint="obrir-les de veritat és una acció a part, des de la fitxa."
          value={state.registrationClosesAt}
          {...(errors.registrationClosesAt
            ? { error: errors.registrationClosesAt }
            : {})}
          onChange={(date) => onChange({ registrationClosesAt: date })}
        />
      </div>
    </div>
  );
}

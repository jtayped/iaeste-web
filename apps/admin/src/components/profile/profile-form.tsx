"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DEGREE_OPTIONS } from "@repo/constants/studies";
import { memberProfileSchema } from "@repo/constants/validators/registration";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";

import type { AdminMemberProfile } from "@/lib/admin-types";
import { useUpdateOwnProfile } from "@/lib/profile";

const YEARS = [1, 2, 3, 4, 5, 6] as const;

interface ProfileFormState {
  name: string;
  surnames: string;
  phone: string;
  degree: string;
  year: number;
}

type ProfileFormErrors = Partial<Record<keyof ProfileFormState, string>>;

function stateFromProfile(profile: AdminMemberProfile): ProfileFormState {
  return {
    name: profile.name,
    surnames: profile.surnames,
    phone: profile.phoneDisplay,
    degree: profile.degree,
    year: profile.studyYear,
  };
}

function validate(state: ProfileFormState) {
  const parsed = memberProfileSchema.safeParse(state);
  if (parsed.success) return { data: parsed.data, errors: {} };

  const errors: ProfileFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      field in state &&
      errors[field as keyof ProfileFormState] === undefined
    ) {
      errors[field as keyof ProfileFormState] = issue.message;
    }
  }
  return { data: undefined, errors };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function TextInput({
  id,
  label,
  value,
  error,
  autoComplete,
  inputMode,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  autoComplete: string;
  inputMode?: "text" | "tel";
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="h-11 sm:h-9"
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function ProfileForm({ profile }: { profile: AdminMemberProfile }) {
  const router = useRouter();
  const update = useUpdateOwnProfile();
  const [fields, setFields] = React.useState(() => stateFromProfile(profile));
  const [errors, setErrors] = React.useState<ProfileFormErrors>({});

  const saved = stateFromProfile(profile);
  const dirty = (Object.keys(fields) as Array<keyof ProfileFormState>).some(
    (key) => fields[key] !== saved[key],
  );

  function change<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validate(fields);
    setErrors(result.errors);
    if (!result.data) {
      const firstInvalid = (
        ["name", "surnames", "phone", "degree", "year"] as const
      ).find((field) => result.errors[field] !== undefined);
      const fieldIds: Record<keyof ProfileFormState, string> = {
        name: "profile-name",
        surnames: "profile-surnames",
        phone: "profile-phone",
        degree: "profile-degree",
        year: "profile-year-1",
      };
      if (firstInvalid) {
        requestAnimationFrame(() =>
          document.getElementById(fieldIds[firstInvalid])?.focus(),
        );
      }
      return;
    }

    update.mutate(result.data, {
      onSuccess: (next) => {
        setFields(stateFromProfile(next.profile));
        setErrors({});
        router.refresh();
      },
    });
  }

  function reset() {
    setFields(saved);
    setErrors({});
  }

  const yearErrorId = "profile-year-error";
  const degreeErrorId = "profile-degree-error";

  return (
    <Card className="rounded-lg border-border p-0 shadow-none">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              id="profile-name"
              label="nom"
              value={fields.name}
              error={errors.name}
              autoComplete="given-name"
              disabled={update.isPending}
              onChange={(value) => change("name", value)}
            />
            <TextInput
              id="profile-surnames"
              label="cognoms"
              value={fields.surnames}
              error={errors.surnames}
              autoComplete="family-name"
              disabled={update.isPending}
              onChange={(value) => change("surnames", value)}
            />
          </div>

          <TextInput
            id="profile-phone"
            label="telèfon"
            value={fields.phone}
            error={errors.phone}
            autoComplete="tel"
            inputMode="tel"
            disabled={update.isPending}
            onChange={(value) => change("phone", value)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="profile-degree">grau</Label>
            <Select
              value={fields.degree}
              disabled={update.isPending}
              onValueChange={(value) => change("degree", value)}
            >
              <SelectTrigger
                id="profile-degree"
                className="h-11 sm:h-9"
                aria-invalid={errors.degree !== undefined}
                aria-describedby={errors.degree ? degreeErrorId : undefined}
              >
                <SelectValue placeholder="tria un grau" />
              </SelectTrigger>
              <SelectContent>
                {DEGREE_OPTIONS.map((degree) => (
                  <SelectItem key={degree} value={degree}>
                    {degree}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id={degreeErrorId} message={errors.degree} />
          </div>

          <fieldset className="space-y-2" disabled={update.isPending}>
            <legend className="text-sm font-medium">curs</legend>
            <div
              className="grid grid-cols-6 gap-1.5"
              aria-describedby={errors.year ? yearErrorId : undefined}
            >
              {YEARS.map((year) => (
                <label key={year} className="relative cursor-pointer">
                  <input
                    id={`profile-year-${year}`}
                    type="radio"
                    name="profile-year"
                    value={year}
                    checked={fields.year === year}
                    aria-invalid={errors.year !== undefined}
                    aria-describedby={errors.year ? yearErrorId : undefined}
                    onChange={() => change("year", year)}
                    className="peer sr-only"
                  />
                  <span className="flex h-11 items-center justify-center rounded-md border border-input text-sm font-medium text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:outline-none sm:h-9">
                    {year}
                  </span>
                </label>
              ))}
            </div>
            <FieldError id={yearErrorId} message={errors.year} />
          </fieldset>

          <p className="sr-only" role="alert" aria-live="assertive">
            {Object.values(errors).some((message) => message !== undefined)
              ? "hi ha errors al formulari. revisa el primer camp indicat."
              : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row-reverse sm:p-5 [&>*]:min-h-11 sm:[&>*]:min-h-9">
          <Button type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? "desant…" : "desa els canvis"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || update.isPending}
            onClick={reset}
          >
            restableix
          </Button>
        </div>
      </form>
    </Card>
  );
}

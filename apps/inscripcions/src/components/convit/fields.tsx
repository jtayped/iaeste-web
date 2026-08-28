"use client";

import React from "react";
import type { UseFormReturn } from "react-hook-form";

import { DEGREE_OPTIONS } from "@repo/constants/studies";
import type { DegreeOption } from "@repo/constants/types/studies";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";

import type { InvitationForm } from "@/lib/invitation-schema";

/**
 * The five fields `/convit` asks for.
 *
 * They mirror the public form's fields but are typed to `InvitationForm`,
 * which has no `email` — the registration form's versions are bound to
 * `RegistrationForm` and cannot be reused without making both generic over a
 * shape they do not share.
 */
type Form = { form: UseFormReturn<InvitationForm> };

export const NameField = ({ form }: Form) => (
  <FormField
    control={form.control}
    name="name"
    render={({ field }) => (
      <FormItem>
        <FormLabel>nom</FormLabel>
        <FormControl>
          <Input
            data-field-name="name"
            className="h-11"
            placeholder="joan"
            required
            autoComplete="given-name"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const SurnamesField = ({ form }: Form) => (
  <FormField
    control={form.control}
    name="surnames"
    render={({ field }) => (
      <FormItem>
        <FormLabel>cognoms</FormLabel>
        <FormControl>
          <Input
            data-field-name="surnames"
            className="h-11"
            placeholder="garcia puig"
            required
            autoComplete="family-name"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const PhoneField = ({ form }: Form) => (
  <FormField
    control={form.control}
    name="phone"
    render={({ field }) => (
      <FormItem>
        <FormLabel>número de telèfon</FormLabel>
        <FormControl>
          <Input
            placeholder="+34 623 32 42 34"
            data-field-name="phone"
            className="h-11"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...field}
          />
        </FormControl>
        <FormDescription>
          si no hi poses prefix, l&apos;entendrem com un número espanyol.
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const DegreeField = ({ form }: Form) => (
  <FormField
    control={form.control}
    name="degree"
    render={({ field }) => (
      <FormItem>
        <FormLabel>grau</FormLabel>
        <FormControl>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger
              className="h-11 w-full"
              data-field-name="degree"
              aria-required="true"
            >
              <SelectValue placeholder="selecciona el teu grau" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] max-w-[300px]">
              {DEGREE_OPTIONS.map((option: DegreeOption) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const YearField = ({ form }: Form) => (
  <FormField
    control={form.control}
    name="year"
    render={({ field }) => (
      <FormItem>
        <FormLabel>curs</FormLabel>
        <FormControl>
          <Input
            placeholder="1"
            data-field-name="year"
            className="h-11"
            type="number"
            min={1}
            max={6}
            required
            {...field}
            onChange={(event) => field.onChange(event.target.valueAsNumber)}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

/**
 * The address the invitation was sent to, shown but not editable.
 *
 * The API binds the account to the token, not to anything in the body, so an
 * editable field here would silently do nothing. Saying that plainly is
 * better than a disabled input with no explanation.
 */
export const BoundEmail = ({ email }: { email: string }) => (
  <div className="space-y-1.5">
    <span className="text-sm font-medium">correu</span>
    <Input value={email} readOnly disabled className="h-11" />
    <p className="text-sm text-muted-foreground">
      és l&apos;adreça on t&apos;hem enviat el convit i no es pot canviar des
      d&apos;aquí.
    </p>
  </div>
);

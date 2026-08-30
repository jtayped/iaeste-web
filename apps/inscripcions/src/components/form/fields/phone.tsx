import type { ProfileForm } from "@/lib/form-schema";
import React from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  fieldProps,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { TextField } from "@repo/ui/text-field";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_CONTROL, FIELD_HINT } from "../field-styles";

/**
 * The hint survives the trim because a bare number is parsed as Spanish, and
 * an exchange programme has plenty of applicants whose number is not.
 */
const PhoneField = ({ form }: { form: UseFormReturn<ProfileForm> }) => {
  return (
    <FormField
      control={form.control}
      name="phone"
      render={({ field, fieldState }) => (
        <TextField {...fieldProps(field, fieldState)}>
          <FormLabel>telèfon</FormLabel>
          <Input
            ref={field.ref}
            placeholder="623 32 42 34"
            data-field-name="phone"
            className={FIELD_CONTROL}
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
          <FormDescription className={FIELD_HINT}>
            amb prefix (+33…) si no és espanyol.
          </FormDescription>
          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </TextField>
      )}
    />
  );
};

export default PhoneField;

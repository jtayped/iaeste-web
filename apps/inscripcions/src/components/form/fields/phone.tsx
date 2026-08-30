import type { ProfileForm } from "@/lib/form-schema";
import React from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../field-styles";

/**
 * The hint survives the trim because a bare number is parsed as Spanish, and
 * an exchange programme has plenty of applicants whose number is not.
 */
const PhoneField = ({ form }: { form: UseFormReturn<ProfileForm> }) => {
  return (
    <FormField
      control={form.control}
      name="phone"
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className={FIELD_LABEL}>telèfon</FormLabel>
          <FormControl>
            <Input
              placeholder="623 32 42 34"
              data-field-name="phone"
              className={FIELD_CONTROL}
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              {...field}
            />
          </FormControl>
          <FormDescription className={FIELD_HINT}>
            amb prefix (+33…) si no és espanyol.
          </FormDescription>
          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </FormItem>
      )}
    />
  );
};

export default PhoneField;

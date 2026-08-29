import type { RegistrationForm } from "@/lib/form-schema";
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

const PhoneField = ({ form }: { form: UseFormReturn<RegistrationForm> }) => {
  return (
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
            escriu-lo amb prefix (per exemple <b>+34 623 32 42 34</b>) si és
            d&apos;un altre país.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default PhoneField;

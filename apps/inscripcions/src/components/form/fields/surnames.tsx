import type { RegistrationForm } from "@/lib/form-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import React from "react";
import { UseFormReturn } from "react-hook-form";

const SurnameField = ({ form }: { form: UseFormReturn<RegistrationForm> }) => {
  return (
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
              placeholder="garcia serra"
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
};

export default SurnameField;

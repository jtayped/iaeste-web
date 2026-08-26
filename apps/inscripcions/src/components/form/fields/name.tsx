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

const NameField = ({ form }: { form: UseFormReturn<RegistrationForm> }) => {
  return (
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
};

export default NameField;

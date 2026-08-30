import type { RegistrationForm } from "@/lib/form-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/lib/utils";
import React from "react";
import { UseFormReturn } from "react-hook-form";

import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../field-styles";

const SurnameField = ({ form }: { form: UseFormReturn<RegistrationForm> }) => {
  return (
    <FormField
      control={form.control}
      name="surnames"
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className={FIELD_LABEL}>cognoms</FormLabel>
          <FormControl>
            <Input
              data-field-name="surnames"
              className={FIELD_CONTROL}
              placeholder="garcia serra"
              required
              autoComplete="family-name"
              {...field}
            />
          </FormControl>
          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </FormItem>
      )}
    />
  );
};

export default SurnameField;

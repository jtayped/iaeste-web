import type { RegistrationForm } from "@/lib/form-schema";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../field-styles";

/**
 * No hint: "repeteix el correu" says everything the old paragraph said, and
 * the mismatch error explains itself the moment it matters.
 */
const ConfirmEmailField = ({
  form,
}: {
  form: UseFormReturn<RegistrationForm>;
}) => {
  return (
    <FormField
      control={form.control}
      name="confirmEmail"
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className={FIELD_LABEL}>repeteix el correu</FormLabel>
          <FormControl>
            <Input
              placeholder="johndoe@alumnes.udl.cat"
              data-field-name="confirmEmail"
              className={FIELD_CONTROL}
              required
              type="email"
              inputMode="email"
              autoComplete="off"
              {...field}
            />
          </FormControl>
          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </FormItem>
      )}
    />
  );
};

export default ConfirmEmailField;

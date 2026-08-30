import type { ProfileForm } from "@/lib/form-schema";
import { fieldProps, FormField, FormLabel, FormMessage } from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { TextField } from "@repo/ui/text-field";
import { cn } from "@repo/ui/lib/utils";
import React from "react";
import { UseFormReturn } from "react-hook-form";

import { FIELD_CONTROL, FIELD_HINT } from "../field-styles";

const NameField = ({ form }: { form: UseFormReturn<ProfileForm> }) => {
  return (
    <FormField
      control={form.control}
      name="name"
      render={({ field, fieldState }) => (
        <TextField {...fieldProps(field, fieldState)}>
          <FormLabel>nom</FormLabel>
          <Input
            ref={field.ref}
            data-field-name="name"
            className={FIELD_CONTROL}
            placeholder="joan"
            required
            autoComplete="given-name"
          />
          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </TextField>
      )}
    />
  );
};

export default NameField;

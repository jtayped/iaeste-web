import type { ProfileForm } from "@/lib/form-schema";
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

const NameField = ({ form }: { form: UseFormReturn<ProfileForm> }) => {
  return (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className={FIELD_LABEL}>nom</FormLabel>
          <FormControl>
            <Input
              data-field-name="name"
              className={FIELD_CONTROL}
              placeholder="joan"
              required
              autoComplete="given-name"
              {...field}
            />
          </FormControl>
          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </FormItem>
      )}
    />
  );
};

export default NameField;

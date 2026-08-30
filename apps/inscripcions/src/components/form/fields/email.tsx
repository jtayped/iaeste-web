import type { RegistrationForm } from "@/lib/form-schema";
import React from "react";
import { UseFormReturn } from "react-hook-form";
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
 * Any address is accepted. A udl.cat one is only a preference — it saves the
 * committee a manual check — so it is phrased as a preference, not a rule the
 * applicant can fail. The hint stays because "the verification link goes
 * here" is the one thing a wrong address makes unrecoverable.
 */
const EmailField = ({ form }: { form: UseFormReturn<RegistrationForm> }) => {
  return (
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className={FIELD_LABEL}>correu electrònic</FormLabel>
          <FormControl>
            <Input
              placeholder="johndoe@alumnes.udl.cat"
              data-field-name="email"
              className={FIELD_CONTROL}
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              {...field}
            />
          </FormControl>
          <FormDescription className={FIELD_HINT}>
            hi enviarem l&apos;enllaç de verificació. millor el de la udl, si en
            tens.
          </FormDescription>
          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </FormItem>
      )}
    />
  );
};

export default EmailField;

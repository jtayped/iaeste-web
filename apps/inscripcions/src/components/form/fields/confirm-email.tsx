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
        <FormItem>
          <FormLabel>confirma el correu</FormLabel>
          <FormControl>
            <Input
              placeholder="johndoe@alumnes.udl.cat"
              data-field-name="confirmEmail"
              className="h-11"
              required
              type="email"
              inputMode="email"
              autoComplete="off"
              {...field}
            />
          </FormControl>
          <FormDescription>
            escriu-lo un altre cop. si hi ha una errata no rebràs l&apos;enllaç
            de verificació i no ens en podrem adonar.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ConfirmEmailField;

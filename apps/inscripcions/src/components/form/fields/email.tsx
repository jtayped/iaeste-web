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

const EmailField = ({ form }: { form: UseFormReturn<RegistrationForm> }) => {
  return (
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Correu de la UdL</FormLabel>
          <FormControl>
            <Input
              placeholder="johndoe@alumnes.udl.cat"
              type="email"
              inputMode="email"
              autoComplete="email"
              {...field}
            />
          </FormControl>
          <FormDescription>
            Ha de ser <b>@udl.cat</b> o <b>@alumnes.udl.cat</b>: així sabem que
            ets de la UdL sense demanar-te cap document, i és on t&apos;enviarem
            l&apos;enllaç per verificar la inscripció.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default EmailField;

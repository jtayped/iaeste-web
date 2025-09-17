import { User } from "@/schemas/user";
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

const NumberField = ({ form }: { form: UseFormReturn<User> }) => {
  return (
    <FormField
      control={form.control}
      name="number"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Número de telèfon</FormLabel>
          <FormControl>
            <Input placeholder="623 32 42 34" autoComplete="tel" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default NumberField;

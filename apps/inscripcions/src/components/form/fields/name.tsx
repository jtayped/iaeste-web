import { User } from "@/schemas/user";
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

const NameField = ({ form }: { form: UseFormReturn<User> }) => {
  return (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nom</FormLabel>
          <FormControl>
            <Input placeholder="John" autoComplete="given-name" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default NameField;

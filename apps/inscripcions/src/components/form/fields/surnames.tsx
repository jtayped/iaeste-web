import { User } from "@repo/constants/validators/user";
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

const SurnameField = ({ form }: { form: UseFormReturn<User> }) => {
  return (
    <FormField
      control={form.control}
      name="surnames"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Cognoms</FormLabel>
          <FormControl>
            <Input placeholder="Doe" autoComplete="family-name" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default SurnameField;

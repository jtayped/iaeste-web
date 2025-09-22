import useFormSchema from "@/validators/contact-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { useTranslations } from "next-intl";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import z from "zod";

const LastNameField = ({
  form,
}: {
  form: UseFormReturn<z.infer<ReturnType<typeof useFormSchema>>>;
}) => {
  const t = useTranslations("contact.lastname");

  return (
    <FormField
      control={form.control}
      name="lastname"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("label")}</FormLabel>
          <FormControl>
            <Input
              placeholder={t("placeholder")}
              autoComplete="family-name"
              {...field}
            />
          </FormControl>
          {t("description") && (
            <FormDescription>{t("description")}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default LastNameField;

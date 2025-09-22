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

const SubjectField = ({
  form,
}: {
  form: UseFormReturn<z.infer<ReturnType<typeof useFormSchema>>>;
}) => {
  const t = useTranslations("contact.subject");

  return (
    <FormField
      control={form.control}
      name="subject"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("label")}</FormLabel>
          <FormControl>
            <Input placeholder={t("placeholder")} {...field} />
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

export default SubjectField;

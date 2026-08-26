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
import type { ContactForm } from "@repo/constants/validators/contact-form";

const SubjectField = ({ form }: { form: UseFormReturn<ContactForm> }) => {
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

import React from "react";
import { UseFormReturn } from "react-hook-form";
import useFormSchema from "@/validators/contact-form";
import { useTranslations } from "next-intl";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Textarea } from "@repo/ui/textarea";
import z from "zod";

const MessageField = ({
  form,
}: {
  form: UseFormReturn<z.infer<ReturnType<typeof useFormSchema>>>;
}) => {
  const t = useTranslations(`contact.message`);

  return (
    <FormField
      control={form.control}
      name="message"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("label")}</FormLabel>
          <FormControl>
            <Textarea placeholder={t("placeholder")} rows={5} {...field} />
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

export default MessageField;

"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { Textarea } from "../ui/textarea";

const formSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(20),
  subject: z.string().max(500),
  message: z.string().max(5000),
});

const ContactField = ({
  translationKey,
  form,
  type = "text",
}: {
  translationKey: "name" | "email" | "subject" | "message";
  form: UseFormReturn<z.infer<typeof formSchema>>;
  type?: string;
}) => {
  const t = useTranslations(`contact.${translationKey}`);

  return (
    <FormField
      control={form.control}
      // Key is the same as the field name
      name={translationKey}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("label")}</FormLabel>
          <FormControl>
            {type === "textarea" ? (
              <Textarea placeholder={t("placeholder")} rows={5} {...field} />
            ) : (
              <Input placeholder={t("placeholder")} {...field} />
            )}
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

const ContactForm = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-5">
          <ContactField translationKey={"email"} form={form} />
          <ContactField translationKey={"name"} form={form} />
        </div>
        <ContactField translationKey={"subject"} form={form} />
        <ContactField
          translationKey={"message"}
          type={"textarea"}
          form={form}
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </Form>
  );
};

export default ContactForm;

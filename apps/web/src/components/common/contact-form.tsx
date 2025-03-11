"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { type z } from "zod";
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
import { sendEmail } from "@/lib/emails";
import { BiCheck, BiLoader } from "react-icons/bi";
import useFormSchema from "@/validators/contact-form";

const ContactField = ({
  translationKey,
  form,
  type = "text",
}: {
  translationKey: keyof z.infer<ReturnType<typeof useFormSchema>>;
  form: UseFormReturn<z.infer<ReturnType<typeof useFormSchema>>>;
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
  const formSchema = useFormSchema();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const { isSubmitting, isSubmitSuccessful } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await sendEmail(values);
  }

  const SubmitButtonContent = () => {
    if (isSubmitSuccessful) {
      return (
        <>
          <BiCheck className="mr-2" />
          Success
        </>
      );
    }

    if (isSubmitting) {
      return <BiLoader className="animate-spin" />;
    }

    return "Submit";
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-2 md:gap-4"
        id="contact-form"
      >
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <ContactField translationKey="email" form={form} />
          <ContactField translationKey="name" form={form} />
        </div>
        <ContactField translationKey="subject" form={form} />
        <ContactField translationKey="message" type="textarea" form={form} />

        <Button
          type="submit"
          disabled={isSubmitting || isSubmitSuccessful}
          className="w-full"
        >
          <SubmitButtonContent />
        </Button>
      </form>
    </Form>
  );
};

export default ContactForm;

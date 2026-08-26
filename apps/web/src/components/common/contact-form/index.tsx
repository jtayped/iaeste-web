"use client";
import { sendContactFormEmail } from "@/lib/emails";
import useContactFormSchema from "@/validators/contact-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ContactForm as ContactFormValues } from "@repo/constants/validators/contact-form";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Form } from "@repo/ui/form";
import { AlertCircle, Check, Loader } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import EmailField from "./fields/email";
import LastNameField from "./fields/lastname";
import MessageField from "./fields/message";
import NameField from "./fields/name";
import SubjectField from "./fields/subject";

const ContactForm = () => {
  const t = useTranslations("contact");
  const formSchema = useContactFormSchema();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      lastname: "",
      subject: "",
      message: "",
    },
  });

  const { isSubmitting, isSubmitSuccessful, errors } = form.formState;

  async function onSubmit(values: ContactFormValues) {
    form.clearErrors("root");

    const result = await sendContactFormEmail(values);

    if (!result.ok) {
      // Keep the user's input so they can retry without retyping it.
      form.setError("root", { message: t("submitBtn.error") });
      return;
    }

    form.reset();
  }

  // `isSubmitSuccessful` only means the handler resolved; a failed send sets a
  // root error, so success is the absence of one.
  const sent = isSubmitSuccessful && !errors.root;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-2 md:gap-4"
        id="contact-form"
      >
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <NameField form={form} />
          <LastNameField form={form} />
        </div>
        <EmailField form={form} />
        <SubjectField form={form} />
        <MessageField form={form} />

        {errors.root && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || sent}
          className="w-full"
        >
          {sent ? (
            <>
              <Check />
              {t("submitBtn.success")}
            </>
          ) : isSubmitting ? (
            <>
              <Loader className="animate-spin" />
              {t("submitBtn.loading")}
            </>
          ) : (
            <>{t("submitBtn.default")}</>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ContactForm;

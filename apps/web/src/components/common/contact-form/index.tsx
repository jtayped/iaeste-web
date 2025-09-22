"use client";
import { sendContactFormEmail } from "@/lib/emails";
import useFormSchema from "@/validators/contact-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/ui/form";
import React from "react";
import { useForm } from "react-hook-form";
import EmailField from "./fields/email";
import NameField from "./fields/name";
import SubjectField from "./fields/subject";
import MessageField from "./fields/message";
import { Button } from "@repo/ui/button";
import { Check, Loader } from "lucide-react";
import { useTranslations } from "next-intl";
import z from "zod";
import LastNameField from "./fields/lastname";

const ContactForm = () => {
  const t = useTranslations("contact");
  const formSchema = useFormSchema();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      lastname: "",
      subject: "",
      message: "",
    },
  });

  const { isSubmitting, isSubmitSuccessful } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await sendContactFormEmail(values);

    // Clear the form after submission
    form.reset();
  }

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

        <Button
          type="submit"
          disabled={isSubmitting || isSubmitSuccessful}
          className="w-full"
        >
          {isSubmitSuccessful ? (
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

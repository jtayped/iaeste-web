"use client";
import { sendContactFormEmail } from "@/lib/emails";
import useContactFormSchema from "@/validators/contact-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CONTACT_FORM_LIMITS,
  type ContactForm as ContactFormValues,
} from "@repo/constants/validators/contact-form";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIndicator,
} from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Form } from "@repo/ui/form";
import { AlertCircle, Check, Loader } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import ContactField from "./field";

const ContactForm = () => {
  const t = useTranslations("contact");
  const formSchema = useContactFormSchema();
  const [sent, setSent] = React.useState(false);

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

  const { isSubmitting, errors } = form.formState;

  async function onSubmit(values: ContactFormValues) {
    form.clearErrors("root");
    setSent(false);

    const result = await sendContactFormEmail(values);

    if (!result.ok) {
      // Keep the user's input so they can retry without retyping it.
      form.setError("root", { message: t("submitBtn.error") });
      return;
    }

    // `reset()` also clears `isSubmitSuccessful`, so the confirmation has to
    // live outside form state or it would flash and disappear.
    form.reset();
    setSent(true);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl border bg-card p-6 shadow-sm md:p-8"
        id="contact-form"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <ContactField form={form} name="name" autoComplete="given-name" />
          <ContactField
            form={form}
            name="lastname"
            autoComplete="family-name"
          />
        </div>
        <ContactField
          form={form}
          name="email"
          type="email"
          autoComplete="email"
        />
        <ContactField form={form} name="subject" />
        <ContactField
          form={form}
          name="message"
          multiline
          max={CONTACT_FORM_LIMITS.message.max}
        />

        {/* Always mounted so screen readers announce whichever result lands. */}
        <div role="status" aria-live="polite" className="empty:hidden">
          {errors.root && (
            <Alert variant="destructive">
              <AlertIndicator>
                <AlertCircle />
              </AlertIndicator>
              <AlertContent>
                <AlertDescription>{errors.root.message}</AlertDescription>
              </AlertContent>
            </Alert>
          )}
          {sent && (
            <Alert variant="accent">
              <AlertIndicator>
                <Check />
              </AlertIndicator>
              <AlertContent>
                <AlertDescription>{t("submitBtn.success")}</AlertDescription>
              </AlertContent>
            </Alert>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full text-base"
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin" />
              {t("submitBtn.loading")}
            </>
          ) : (
            t("submitBtn.default")
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ContactForm;

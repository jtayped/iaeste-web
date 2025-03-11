"use server";

import { type z } from "zod";
import { Resend } from "resend";
import type useFormSchema from "@/validators/contact-form";
import { ContactFormEmail } from "@/emails/contact-form";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  formValues: z.infer<ReturnType<typeof useFormSchema>>
) {
  const { email, name, subject, message } = formValues;

  // TODO: form validation

  await resend.emails.send({
    from: process.env.CONTACT_FORM_FROM ?? "",
    to: process.env.CONTACT_FORM_TO ?? "",
    subject: `IAESTE WEB | ${subject}`,
    react: await ContactFormEmail({ email, name, message }),
  });
}

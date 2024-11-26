"use server";

import { Resend } from "resend";
import formSchema from "@/validators/contact-form";
import { z } from "zod";
import { ContactFormEmail } from "@/emails/contact-form";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(formValues: z.infer<typeof formSchema>) {
  const { email, name, subject, message } = formValues;

  formSchema.parse(formValues)

  await resend.emails.send({
    from: process.env.CONTACT_FORM_FROM as string,
    to: email,
    subject: `IAESTE WEB | ${subject}`,
    react: ContactFormEmail({ email, name, message }),
  });
}

"use server";

import { type z } from "zod";
import type useFormSchema from "@/validators/contact-form";
import { sendEmail } from "@repo/email/resend";
import ContactFormEmail from "@repo/email/contact-form";

export async function sendContactFormEmail(
  values: z.infer<ReturnType<typeof useFormSchema>>
) {
  await sendEmail(
    "iaeste.lleida@gmail.com",
    `Formulari WEB | ${values.subject}`,
    ContactFormEmail(values)
  );
}

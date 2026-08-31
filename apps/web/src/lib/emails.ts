"use server";

import ContactFormEmail from "@repo/email/contact-form";
import { createResendEmailer } from "@repo/email/resend";
import { contactFormSchema } from "@repo/constants/validators/contact-form";
import { env } from "@repo/env/web/server";

export type SendContactFormResult =
  { ok: true } | { ok: false; reason: "invalid" | "failed" };

const emailer = createResendEmailer({
  apiKey: env.RESEND_API_KEY,
  from: env.CONTACT_FORM_FROM,
});

/**
 * Server action behind the public contact form.
 *
 * The input is re-validated here: the client schema is a convenience, not a
 * boundary — a server action is a public HTTP endpoint that anyone can call
 * with an arbitrary payload.
 */
export async function sendContactFormEmail(
  input: unknown,
): Promise<SendContactFormResult> {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const values = parsed.data;

  try {
    await emailer.send({
      to: env.CONTACT_FORM_TO,
      subject: `formulari web · ${values.subject}`,
      react: ContactFormEmail(values),
    });
  } catch (error) {
    console.error("Failed to send contact form email", error);
    return { ok: false, reason: "failed" };
  }

  return { ok: true };
}

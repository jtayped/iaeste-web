import { z } from "zod";

/**
 * Length bounds for the public contact form. Exported so the UI can surface
 * them (counters, `maxLength` attributes) without restating the numbers.
 */
export const CONTACT_FORM_LIMITS = {
  name: { min: 2, max: 20 },
  lastname: { min: 2, max: 20 },
  subject: { min: 1, max: 500 },
  message: { min: 10, max: 5_000 },
} as const;

/**
 * Resolves a validation message from a key relative to the `contact`
 * translation namespace, e.g. `("name.min", { min: 2 })`.
 */
export type ContactFormMessages = (
  key: string,
  values?: Record<string, number>,
) => string;

/**
 * Falls back to the translation key itself. The server never shows these to a
 * user — it answers with a generic error — so a key is more useful in a log
 * than a hard-coded English sentence that could drift from the real copy.
 */
const keyAsMessage: ContactFormMessages = (key) => key;

/**
 * Builds the contact form schema. The shape lives here once; callers supply the
 * message source. The client passes `next-intl`'s translator for localised
 * errors, the server uses the default so the same rules run on both sides.
 */
export function createContactFormSchema(t: ContactFormMessages = keyAsMessage) {
  const { name, lastname, subject, message } = CONTACT_FORM_LIMITS;

  return z.object({
    email: z.string().email(t("email.invalid")),
    name: z
      .string()
      .trim()
      .min(name.min, t("name.min", { min: name.min }))
      .max(name.max, t("name.max", { max: name.max })),
    lastname: z
      .string()
      .trim()
      .min(lastname.min, t("lastname.min", { min: lastname.min }))
      .max(lastname.max, t("lastname.max", { max: lastname.max })),
    subject: z
      .string()
      .trim()
      .min(subject.min, t("subject.min", { min: subject.min }))
      .max(subject.max, t("subject.max", { max: subject.max })),
    message: z
      .string()
      .trim()
      .min(message.min, t("message.min", { min: message.min }))
      .max(message.max, t("message.max", { max: message.max })),
  });
}

/** Server-side schema. Structurally identical to the localised client schema. */
export const contactFormSchema = createContactFormSchema();

export type ContactForm = z.infer<typeof contactFormSchema>;

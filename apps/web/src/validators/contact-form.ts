"use client";

import { useTranslations } from "next-intl";

import { createContactFormSchema } from "@repo/constants/validators/contact-form";

/**
 * Localised contact form schema for client-side validation.
 *
 * The shape itself lives in `@repo/constants` so the server action can enforce
 * the same rules; this hook only supplies translated messages.
 */
const useContactFormSchema = () => {
  const t = useTranslations("contact");

  return createContactFormSchema(t);
};

export default useContactFormSchema;

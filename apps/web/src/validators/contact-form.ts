import { z } from "zod";
import { useTranslations } from "next-intl";

const useFormSchema = () => {
  const t = useTranslations();

  return z.object({
    email: z
      .string({
        required_error: t("contact.email.required"),
      })
      .email({
        message: t("contact.email.invalid"),
      }),
    name: z
      .string({
        required_error: t("contact.name.required"),
      })
      .min(2, {
        message: t("contact.name.min", { min: 2 }),
      })
      .max(20, {
        message: t("contact.name.max", { max: 20 }),
      }),
    subject: z
      .string({
        required_error: t("contact.subject.required"),
      })
      .min(1, {
        message: t("contact.subject.min", { min: 1 }),
      })
      .max(500, {
        message: t("contact.subject.max", { max: 500 }),
      }),
    message: z
      .string({
        required_error: t("contact.message.required"),
      })
      .min(10, {
        message: t("contact.message.min", { min: 10 }),
      })
      .max(5000, {
        message: t("contact.message.max", { max: 5000 }),
      }),
  });
};

export default useFormSchema;

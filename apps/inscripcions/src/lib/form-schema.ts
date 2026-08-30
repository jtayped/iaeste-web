import {
  type Registration,
  registrationSchema,
} from "@repo/constants/validators/registration";
import { z } from "zod";

/**
 * The shared registration contract plus the client-only email confirmation.
 *
 * A mistyped email is the one unrecoverable error in this flow — the
 * verification link goes to an address the applicant will never read, and the
 * API will not hand out a second registration for the same campaign — so it is
 * worth a second input. `toRegistration` strips the extra field before the
 * request goes out; the shared schema in `@repo/constants` stays the single
 * definition of what the API accepts.
 */
export const registrationFormSchema = registrationSchema
  .extend({
    confirmEmail: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "repeteix el correu per confirmar-lo"),
  })
  .refine((values) => values.email === values.confirmEmail, {
    message: "els dos correus no coincideixen",
    path: ["confirmEmail"],
  });

export type RegistrationForm = z.infer<typeof registrationFormSchema>;

/** Drops the client-only fields so the body matches `RegistrationRequest`. */
export function toRegistration(values: RegistrationForm): Registration {
  return {
    name: values.name,
    surnames: values.surnames,
    email: values.email,
    phone: values.phone,
    degree: values.degree,
    year: values.year,
    ...(values.note ? { note: values.note } : {}),
  };
}

/** Field order used for the error summary and for focusing the first mistake. */
export const FIELD_ORDER = [
  "name",
  "surnames",
  "email",
  "confirmEmail",
  "phone",
  "degree",
  "year",
  "note",
] as const satisfies readonly (keyof RegistrationForm)[];

/**
 * Kept word for word in sync with each field's visible label: the error
 * summary reads "<label>: <message>", so a name the applicant cannot find on
 * screen is worse than no summary at all.
 */
export const FIELD_LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  name: "nom",
  surnames: "cognoms",
  email: "correu electrònic",
  confirmEmail: "repeteix el correu",
  phone: "telèfon",
  degree: "grau",
  year: "curs",
  note: "nota",
};

/** Whether a field name reported by the API maps to a field we can highlight. */
export function isFormField(
  field: string,
): field is (typeof FIELD_ORDER)[number] {
  return (FIELD_ORDER as readonly string[]).includes(field);
}

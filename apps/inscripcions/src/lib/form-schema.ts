import {
  type Registration,
  registrationSchema,
} from "@repo/constants/validators/registration";
import { z } from "zod";

/**
 * A deliberately forgiving client-side check: digits, with the separators
 * people actually type, and an optional `+` country code. The real rule lives
 * in `apps/api`'s `parsePhone`, which parses the number properly — this only
 * catches the obvious mistakes before a round trip, and anything it lets
 * through is still re-validated server-side and surfaced on this field.
 */
const PLAUSIBLE_PHONE = /^\+?[\d\s().-]+$/;

function countsAsPhone(value: string): boolean {
  if (!PLAUSIBLE_PHONE.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 6 && digits <= 15;
}

/**
 * The registration contract plus the two client-only concerns the API has no
 * business knowing about: a confirmed email address and a friendlier phone
 * check.
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
    phone: registrationSchema.shape.phone.refine(
      countsAsPhone,
      "Escriu un número de telèfon vàlid, per exemple +34 623 32 42 34",
    ),
    confirmEmail: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Repeteix el correu per confirmar-lo"),
  })
  .refine((values) => values.email === values.confirmEmail, {
    message: "Els dos correus no coincideixen",
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

export const FIELD_LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  name: "Nom",
  surnames: "Cognoms",
  email: "Correu de la UdL",
  confirmEmail: "Confirma el correu",
  phone: "Número de telèfon",
  degree: "Grau",
  year: "Curs",
  note: "Nota",
};

/** Whether a field name reported by the API maps to a field we can highlight. */
export function isFormField(
  field: string,
): field is (typeof FIELD_ORDER)[number] {
  return (FIELD_ORDER as readonly string[]).includes(field);
}

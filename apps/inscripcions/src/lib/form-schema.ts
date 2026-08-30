import {
  type RegistrationProfile,
  registrationProfileSchema,
} from "@repo/constants/validators/registration";
import { z } from "zod";

/**
 * The details step, for both ways in.
 *
 * There is no email field and no confirmation field any more. A public
 * applicant proved their address two steps earlier by typing a code we mailed
 * them; an invited person never types it at all, because it is bound to their
 * invitation token. Mistyping the address is no longer possible, which is
 * what the confirmation field existed to catch.
 */
export const profileFormSchema = registrationProfileSchema;

export type ProfileForm = RegistrationProfile;

/** Step one of the public flow, on its own. */
export const emailStepSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "escriu el teu correu")
    .email("adreça de correu electrònic no vàlida"),
});

export type EmailStep = z.infer<typeof emailStepSchema>;

/** Step two. Six digits, nothing else — the OTP control cannot produce more. */
export const codeStepSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "el codi té sis xifres"),
});

export type CodeStep = z.infer<typeof codeStepSchema>;

/** Field order used for the error summary and for focusing the first mistake. */
export const FIELD_ORDER = [
  "name",
  "surnames",
  "phone",
  "degree",
  "year",
  "note",
] as const satisfies readonly (keyof ProfileForm)[];

/**
 * Kept word for word in sync with each field's visible label: the error
 * summary reads "<label>: <message>", so a name the applicant cannot find on
 * screen is worse than no summary at all.
 */
export const FIELD_LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  name: "nom",
  surnames: "cognoms",
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

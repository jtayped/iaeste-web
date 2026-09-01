import { z } from "zod";

import {
  type RegistrationProfile,
  registrationProfileSchema,
} from "@repo/constants/validators/registration";
import { memberEmailSchema } from "@repo/constants/validators/member-email";

/**
 * The details step, for both ways in.
 *
 * There is no email field here. A public applicant proved their address by
 * entering a code we mailed them; an invited person has it bound to their
 * invitation token. Both routes therefore reach this form with a proven
 * address rather than asking someone to type it twice.
 */
export const profileFormSchema = registrationProfileSchema;

export type ProfileForm = RegistrationProfile;

/** Step one of the public flow, on its own. */
export const emailStepSchema = z.object({ email: memberEmailSchema });

export type EmailStep = z.infer<typeof emailStepSchema>;

/**
 * The form keeps the raw input as a string while the shared schema owns email
 * validation and normalisation. The submit handler runs the shared schema
 * again before classifying the address as university or personal.
 */
export const emailStepFormSchema = z
  .object({ email: z.string() })
  .superRefine((values, ctx) => {
    const result = emailStepSchema.safeParse(values);
    if (result.success) return;

    for (const issue of result.error.issues) {
      ctx.addIssue({
        code: "custom",
        path: [...issue.path],
        message: issue.message,
      });
    }
  });

/** What the inputs hold while they are being typed: always strings, never absent. */
export type EmailStepValues = z.infer<typeof emailStepFormSchema>;

/** Step two. The OTP control only accepts digits, and the server repeats this check. */
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

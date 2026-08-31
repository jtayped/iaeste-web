import { z } from "zod";

import {
  type RegistrationProfile,
  registrationProfileSchema,
} from "@repo/constants/validators/registration";
import {
  memberEmailsSchema,
  type MemberEmails,
} from "@repo/constants/validators/member-email";

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
export const emailStepSchema = memberEmailsSchema;

export type EmailStep = MemberEmails;

/**
 * The same rules, bound to what the two inputs actually hold.
 *
 * A blank field means "not supplied", which the shared schema implements with
 * a `preprocess` — and that widens its input type to `unknown`, which React
 * Hook Form cannot bind a text input to. This wrapper is string-in, string-out
 * so the form has a concrete shape to bind to, and delegates every actual
 * judgement to the shared schema, which stays the only place the rules live.
 * The submit handler runs that schema again to get the normalised addresses.
 */
export const emailStepFormSchema = z
  .object({ universityEmail: z.string(), personalEmail: z.string() })
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

/**
 * "At least one address" is a rule about the pair, not about either field, so
 * the form shows it once above both rather than hanging it off whichever field
 * the schema happened to attach it to. Read back out of the schema itself so
 * the copy on screen cannot drift from the copy that is enforced.
 */
export const AT_LEAST_ONE_EMAIL_MESSAGE: string =
  emailStepSchema.safeParse({ universityEmail: "", personalEmail: "" }).error
    ?.issues[0]?.message ?? "cal indicar com a mínim una adreça de correu";

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

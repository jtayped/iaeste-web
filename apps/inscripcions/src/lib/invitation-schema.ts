import { z } from "zod";

import { DEGREE_OPTIONS } from "@repo/constants/studies";
import { isValidPhone } from "@repo/constants/validators/phone";

/**
 * What `/convit` asks an invited person for.
 *
 * It is deliberately *not* `registrationSchema`: there is no email field here
 * at all. The address is bound to the invitation token, and the API ignores
 * anything a body claims about it — so offering an editable email would be
 * offering a control that does nothing.
 *
 * The rules that do overlap (a 2-character minimum, `isValidPhone`, the degree
 * list, years 1–6) are the same ones, imported from the same places, so the
 * client and `invitationAcceptBodySchema` cannot drift apart.
 */
export const invitationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "el nom ha de tenir almenys 2 caràcters")
    .max(120, "el nom no pot superar els 120 caràcters"),
  surnames: z
    .string()
    .trim()
    .min(2, "els cognoms han de tenir almenys 2 caràcters")
    .max(120, "els cognoms no poden superar els 120 caràcters"),
  phone: z
    .string()
    .trim()
    .min(1, "el número és obligatori")
    .refine(isValidPhone, "el número de telèfon no és vàlid"),
  degree: z.enum(DEGREE_OPTIONS, {
    error: "has de seleccionar un grau",
  }),
  year: z
    .number({ error: "el curs ha de ser un número" })
    .int("el curs ha de ser un número enter")
    .min(1, "el curs ha de ser com a mínim 1")
    .max(6, "el curs ha d'estar entre 1 i 6"),
});

export type InvitationForm = z.infer<typeof invitationFormSchema>;

/** Field order for the error summary and for focusing the first mistake. */
export const INVITATION_FIELD_ORDER = [
  "name",
  "surnames",
  "phone",
  "degree",
  "year",
] as const satisfies readonly (keyof InvitationForm)[];

export const INVITATION_FIELD_LABELS: Record<
  (typeof INVITATION_FIELD_ORDER)[number],
  string
> = {
  name: "nom",
  surnames: "cognoms",
  phone: "número de telèfon",
  degree: "grau",
  year: "curs",
};

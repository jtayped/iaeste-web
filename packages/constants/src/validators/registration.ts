import { z } from "zod";

import { DEGREE_OPTIONS } from "../constants/studies";
import { memberEmailsSchema } from "./member-email";
import { isValidPhone } from "./phone";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("adreça de correu electrònic no vàlida");

/**
 * Everything the registration form asks for except the address itself.
 *
 * Split out because the address is no longer just another field. The public
 * form proves it in its own step before any of this is collected, and an
 * invited person never types it at all — it is bound to their invitation
 * token. Both paths still collect exactly these fields, under exactly these
 * rules, from this one definition.
 */
export const registrationProfileSchema = z.object({
  name: z.string().trim().min(2, "el nom ha de tenir almenys 2 caràcters"),
  surnames: z
    .string()
    .trim()
    .min(2, "els cognoms han de tenir almenys 2 caràcters"),
  phone: z
    .string()
    .trim()
    .min(1, "el número és obligatori")
    .refine(isValidPhone, "el número de telèfon no és vàlid"),
  degree: z.enum(DEGREE_OPTIONS, {
    error: "has de seleccionar un grau",
  }),
  year: z
    .number({
      error: "l'any ha de ser un número",
    })
    .int("l'any ha de ser un número enter")
    .min(1, "l'any ha de ser com a mínim 1")
    .max(6, "l'any ha d'estar entre 1 i 6"),
  note: z
    .string()
    .trim()
    .max(2_000, "la nota no pot superar els 2.000 caràcters")
    .optional(),
});

export type RegistrationProfile = z.infer<typeof registrationProfileSchema>;

/**
 * The mutable part of an existing member's profile.
 *
 * This deliberately reuses the registration rules. A person's current
 * details and the details collected when they join must not accept different
 * names, phone numbers, degrees or study years. The annual registration note
 * is a historical snapshot, so it is the only field omitted here.
 */
export const memberProfileSchema = registrationProfileSchema.omit({
  note: true,
});

export type MemberProfile = z.infer<typeof memberProfileSchema>;

/**
 * A profile plus the address it belongs to. Still the shape stored in a
 * `registration` row and the one an admin export reads, so it stays defined
 * here rather than being reassembled per caller.
 */
export const registrationSchema = registrationProfileSchema.extend(
  memberEmailsSchema.shape,
);

export type Registration = z.infer<typeof registrationSchema>;

/** The address on its own — the public form's first step submits only this. */
export const registrationEmailSchema = z.object({ email: emailSchema });

import { z } from "zod";

import { DEGREE_OPTIONS } from "../constants/studies";

const universityEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Adreça de correu electrònic no vàlida")
  .refine((email) => {
    const domain = email.split("@").at(-1);
    return domain === "udl.cat" || domain?.endsWith(".udl.cat") === true;
  }, "El correu ha de ser de la UdL");

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "El nom ha de tenir almenys 2 caràcters"),
  surnames: z
    .string()
    .trim()
    .min(2, "Els cognoms han de tenir almenys 2 caràcters"),
  email: universityEmailSchema,
  phone: z.string().trim().min(1, "El número és obligatori"),
  degree: z.enum(DEGREE_OPTIONS, {
    error: "Has de seleccionar un grau",
  }),
  year: z
    .number({
      error: "L'any ha de ser un número",
    })
    .int("L'any ha de ser un número enter")
    .min(1, "L'any ha de ser com a mínim 1")
    .max(6, "L'any ha d'estar entre 1 i 6"),
  previousMember: z.boolean(),
  note: z
    .string()
    .trim()
    .max(2_000, "La nota no pot superar els 2.000 caràcters")
    .optional(),
});

export type Registration = z.infer<typeof registrationSchema>;

import { DEGREE_OPTIONS } from "../constants/studies";
import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(2, "El nom ha de tenir almenys 2 caràcters"),
  surnames: z.string().min(2, "Els cognoms han de tenir almenys 2 caràcters"),
  email: z
    .string()
    .email("Adreça de correu electrònic no vàlida")
    .refine((e) => e.endsWith("udl.cat"), "El correu té que ser de la uni :("),
  number: z.string().min(1, "El número és obligatori"),
  degree: z.enum(DEGREE_OPTIONS, {
    errorMap: () => ({ message: "Has de seleccionar un grau" }),
  }),
  year: z
    .number({
      invalid_type_error: "L'any ha de ser un número",
      required_error: "L'any és obligatori",
    })
    .nonnegative("L'any no pot ser negatiu")
    .int("L'any ha de ser un número enter")
    .min(1, "L'any ha de ser com a mínim 1")
    .max(6, "L'any ha d'estar entre 1 i 6"),
  previousMember: z.boolean(),
  note: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;

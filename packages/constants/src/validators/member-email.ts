import { z } from "zod";

export const UNIVERSITY_EMAIL_DOMAINS = ["udl.cat", "alumnes.udl.cat"] as const;

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isUniversityEmail(value: string): boolean {
  const [, domain = ""] = normaliseEmail(value).split("@");
  return UNIVERSITY_EMAIL_DOMAINS.some((allowed) => domain === allowed);
}

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("adreça de correu electrònic no vàlida");

export const universityEmailSchema = email.refine(
  isUniversityEmail,
  "fes servir el correu @udl.cat o @alumnes.udl.cat",
);

export const personalEmailSchema = email.refine(
  (value) => !isUniversityEmail(value),
  "fes servir una adreça personal, no la de la udl",
);

/** An empty or blank field means "not supplied" rather than an invalid address. */
function optionalEmail(
  schema: typeof universityEmailSchema | typeof personalEmailSchema,
) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );
}

/**
 * A member may register with a university address, a personal one, or both
 * — never neither, per the plan's "either address, not both" requirement.
 * Whichever one (or two) is supplied still goes through its own domain
 * check above.
 */
export const memberEmailsSchema = z
  .object({
    universityEmail: optionalEmail(universityEmailSchema),
    personalEmail: optionalEmail(personalEmailSchema),
  })
  .refine(
    ({ universityEmail, personalEmail }) =>
      Boolean(universityEmail || personalEmail),
    {
      path: ["personalEmail"],
      message: "cal indicar com a mínim una adreça de correu",
    },
  )
  .refine(
    ({ universityEmail, personalEmail }) =>
      !universityEmail || !personalEmail || universityEmail !== personalEmail,
    {
      path: ["personalEmail"],
      message: "els dos correus han de ser diferents",
    },
  );

export type MemberEmails = z.infer<typeof memberEmailsSchema>;
export type MemberEmailKind = "university" | "personal";

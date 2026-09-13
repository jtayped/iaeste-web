import { z } from "zod";

/**
 * A one-off email the committee writes and sends to a selection of people
 * from an admin table ("come to the AGO on the 3rd", "bring your student
 * card"). Shared here so the composer, the API route and the React Email
 * template all agree on one shape — the repo's standing rule that a schema is
 * defined once and imported by both sides.
 *
 * The body is markdown rather than HTML: `@react-email/markdown` turns it into
 * table-based email HTML that survives Gmail and Outlook, which hand-written
 * HTML pasted into a textarea does not.
 */

/**
 * Placeholders a broadcast may use, resolved per recipient at send time.
 *
 * Deliberately a closed set with Catalan names: the composer validates against
 * it, so `{{nom}}` mistyped as `{{name}}` is a compose-time error rather than
 * three hundred emails that literally read "hola {{name}},".
 */
export const BROADCAST_PLACEHOLDERS = ["nom", "cognoms", "correu"] as const;

export type BroadcastPlaceholder = (typeof BROADCAST_PLACEHOLDERS)[number];

/** What a broadcast knows about one recipient — the placeholder inputs. */
export interface BroadcastRecipient {
  email: string;
  name: string;
  surnames: string;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Placeholder names used in `text` that are not in `BROADCAST_PLACEHOLDERS`.
 * Returned in source order, de-duplicated, so the composer can name every
 * mistake at once instead of one per save.
 */
export function unknownPlaceholders(text: string): string[] {
  const unknown = new Set<string>();
  for (const [, name] of text.matchAll(PLACEHOLDER_PATTERN)) {
    if (name && !(BROADCAST_PLACEHOLDERS as readonly string[]).includes(name)) {
      unknown.add(name);
    }
  }
  return [...unknown];
}

/**
 * Substitutes every known placeholder in `text` for this recipient.
 *
 * Unknown placeholders are left exactly as written rather than blanked: the
 * schema below already refuses to accept them, so reaching this function with
 * one means a caller bypassed validation, and a visible `{{typo}}` in a test
 * send is a better failure than a silently empty sentence.
 */
export function applyPlaceholders(
  text: string,
  recipient: BroadcastRecipient,
): string {
  const values: Record<BroadcastPlaceholder, string> = {
    nom: recipient.name,
    cognoms: recipient.surnames,
    correu: recipient.email,
  };
  return text.replace(PLACEHOLDER_PATTERN, (match, name: string) =>
    (BROADCAST_PLACEHOLDERS as readonly string[]).includes(name)
      ? values[name as BroadcastPlaceholder]
      : match,
  );
}

function noUnknownPlaceholders<T extends z.ZodType<string>>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const unknown = unknownPlaceholders(value);
    if (unknown.length === 0) return;
    ctx.addIssue({
      code: "custom",
      message: `aquestes variables no existeixen: ${unknown
        .map((name) => `{{${name}}}`)
        .join(", ")}. les disponibles són ${BROADCAST_PLACEHOLDERS.map(
        (name) => `{{${name}}}`,
      ).join(", ")}.`,
    });
  });
}

export const BROADCAST_SUBJECT_MAX = 140;
export const BROADCAST_BODY_MAX = 8000;
export const BROADCAST_HEADING_MAX = 90;
export const BROADCAST_CTA_LABEL_MAX = 40;

export const broadcastSubjectSchema = noUnknownPlaceholders(
  z
    .string()
    .trim()
    .min(1, "cal un assumpte")
    .max(
      BROADCAST_SUBJECT_MAX,
      `l'assumpte no pot passar de ${BROADCAST_SUBJECT_MAX} caràcters`,
    ),
);

/**
 * The big line at the top of the email. Optional — the template falls back to
 * the subject, which is right far more often than not: a heading that merely
 * restates the subject is noise, and one that contradicts it is worse.
 */
export const broadcastHeadingSchema = noUnknownPlaceholders(
  z
    .string()
    .trim()
    .min(1, "el títol no pot ser buit")
    .max(
      BROADCAST_HEADING_MAX,
      `el títol no pot passar de ${BROADCAST_HEADING_MAX} caràcters`,
    ),
);

export const broadcastBodySchema = noUnknownPlaceholders(
  z
    .string()
    .trim()
    .min(1, "cal escriure el missatge")
    .max(
      BROADCAST_BODY_MAX,
      `el missatge no pot passar de ${BROADCAST_BODY_MAX} caràcters`,
    ),
);

/**
 * The optional big button under the message. `https` only — a `mailto:` or a
 * `javascript:` href in a mass email is either a mistake or an attack, and the
 * one legitimate use (link to a page) is always https here.
 */
export const broadcastCallToActionSchema = z.object({
  label: noUnknownPlaceholders(
    z
      .string()
      .trim()
      .min(1, "cal un text per al botó")
      .max(
        BROADCAST_CTA_LABEL_MAX,
        `el text del botó no pot passar de ${BROADCAST_CTA_LABEL_MAX} caràcters`,
      ),
  ),
  href: z
    .string()
    .trim()
    .url("l'enllaç del botó no és una adreça vàlida")
    .refine(
      (value) => value.startsWith("https://"),
      "l'enllaç del botó ha de començar per https://",
    ),
});

export const broadcastContentSchema = z.object({
  subject: broadcastSubjectSchema,
  heading: broadcastHeadingSchema.optional(),
  body: broadcastBodySchema,
  callToAction: broadcastCallToActionSchema.optional(),
});

export type BroadcastContent = z.infer<typeof broadcastContentSchema>;

/** Resolves every placeholder in a whole broadcast for one recipient. */
export function personaliseBroadcast(
  content: BroadcastContent,
  recipient: BroadcastRecipient,
): BroadcastContent {
  return {
    subject: applyPlaceholders(content.subject, recipient),
    ...(content.heading
      ? { heading: applyPlaceholders(content.heading, recipient) }
      : {}),
    body: applyPlaceholders(content.body, recipient),
    ...(content.callToAction
      ? {
          callToAction: {
            label: applyPlaceholders(content.callToAction.label, recipient),
            href: content.callToAction.href,
          },
        }
      : {}),
  };
}

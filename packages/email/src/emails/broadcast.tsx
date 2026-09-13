import { Button, Heading, Markdown, Section } from "@react-email/components";
import type { BroadcastContent } from "@repo/constants/validators/broadcast";
import EmailWrapper from "./wrapper";

/**
 * The one-off email an admin writes in the composer and sends to a table
 * selection. Every other template in this package is a fixed message with
 * slots; this one is the reverse — fixed chrome around free text — so the
 * committee can say something we never anticipated without it looking like it
 * came from somewhere else.
 *
 * The body arrives as markdown already personalised for this recipient (see
 * `personaliseBroadcast` in `@repo/constants/validators/broadcast`). Rendering
 * it here rather than in the composer is what makes the preview honest: the
 * admin previews this component, so the preview *is* the email.
 */
export type BroadcastProps = BroadcastContent & {
  /** Overrides the inbox preview line; defaults to the subject. */
  previewText?: string;
};

/**
 * `Markdown`'s defaults are a browser document's, not this wrapper's: 16px
 * headings, blue underlined links, no paragraph rhythm. These bring it into
 * line with `<Text>` and the navy buttons the other templates use, so a
 * broadcast sits in an inbox next to an acceptance email without looking like
 * a different sender.
 */
const markdownStyles = {
  h1: { fontSize: "24px", fontWeight: 600, margin: "24px 0 12px" },
  h2: { fontSize: "20px", fontWeight: 600, margin: "20px 0 10px" },
  h3: { fontSize: "17px", fontWeight: 600, margin: "18px 0 8px" },
  p: { fontSize: "14px", lineHeight: "24px", margin: "16px 0" },
  li: { fontSize: "14px", lineHeight: "24px", margin: "6px 0" },
  link: { color: "#1e3a8a", textDecoration: "underline" },
  blockQuote: {
    borderLeft: "3px solid #eaeaea",
    margin: "16px 0",
    padding: "4px 0 4px 16px",
    color: "#555555",
  },
  codeInline: {
    background: "#f4f4f5",
    borderRadius: "4px",
    padding: "2px 4px",
  },
};

export const Broadcast = ({
  subject,
  heading,
  body,
  callToAction,
  previewText,
}: BroadcastProps) => (
  <EmailWrapper previewText={previewText ?? subject}>
    <Heading className="mt-4">{heading ?? subject}</Heading>
    <Markdown markdownCustomStyles={markdownStyles}>{body}</Markdown>
    {callToAction && (
      <Section>
        <Button
          href={callToAction.href}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          {callToAction.label}
        </Button>
      </Section>
    )}
  </EmailWrapper>
);

Broadcast.PreviewProps = {
  subject: "assemblea general ordinària · 3 d'octubre",
  heading: "ens veiem a l'assemblea!",
  body: [
    "hola Anna,",
    "",
    "la teva sol·licitud ja és a la cua del comitè. l'acceptarem **en persona**",
    "a l'assemblea general ordinària:",
    "",
    "- **dia:** dijous 3 d'octubre",
    "- **hora:** 18:00",
    "- **lloc:** aula 1.01, campus de Cappont",
    "",
    "porta el carnet d'estudiant. si no hi pots ser, respon aquest correu i ho",
    "mirem.",
  ].join("\n"),
  callToAction: {
    label: "com arribar-hi",
    href: "https://example.com/campus",
  },
} as BroadcastProps;

export default Broadcast;

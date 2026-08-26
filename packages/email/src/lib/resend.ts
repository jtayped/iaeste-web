import type React from "react";
import { Resend } from "resend";

export type EmailerConfig = {
  apiKey: string;
  /** Verified sender address, e.g. `noreply@iaestelleida.cat`. */
  from: string;
};

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  react: React.ReactNode;
};

export interface Emailer {
  send(options: SendEmailOptions): Promise<void>;
}

/**
 * Builds a Resend-backed emailer. Configuration is injected rather than read
 * from `process.env` so this package stays deployable-agnostic and testable:
 * callers pass a validated config, tests pass a fake `Emailer`.
 */
export function createResendEmailer(config: EmailerConfig): Emailer {
  const resend = new Resend(config.apiKey);

  return {
    async send({ to, subject, react }) {
      const { error } = await resend.emails.send({
        from: config.from,
        to,
        subject,
        react,
      });

      // Resend reports delivery failures in the payload, not by throwing.
      if (error) {
        throw new Error(`Resend rejected the email: ${error.message}`);
      }
    },
  };
}

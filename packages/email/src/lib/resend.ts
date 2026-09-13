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

/**
 * One already-rendered message in a batch.
 *
 * `html` rather than `react` on purpose: the caller renders each message
 * itself, so the bytes the composer previewed are the bytes that go out, and
 * the batch path does not depend on the Resend SDK's own React rendering.
 */
export type BatchEmail = {
  to: string;
  subject: string;
  html: string;
};

export type BatchSendResult = {
  sent: number;
  /** Every address the provider would not take, with the reason it gave. */
  failed: { to: string; reason: string }[];
};

export interface Emailer {
  send(options: SendEmailOptions): Promise<void>;
  /**
   * Sends one distinct message per recipient. Each person gets their own
   * email — never one message with everybody in `to`, which would publish the
   * whole list to everybody on it.
   */
  sendBatch(emails: readonly BatchEmail[]): Promise<BatchSendResult>;
}

/** Resend's documented ceiling for one `/emails/batch` call. */
export const BATCH_CHUNK_SIZE = 100;

/**
 * Gap between chunks. Resend's default account limit is two requests a
 * second; one batch call is one request, so this is deliberately generous —
 * the slowest realistic broadcast (five hundred people) still finishes in
 * about three seconds, and staying clear of a 429 matters far more than those
 * three seconds do.
 */
const CHUNK_PAUSE_MS = 600;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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

    async sendBatch(emails) {
      const result: BatchSendResult = { sent: 0, failed: [] };
      const chunks = chunk(emails, BATCH_CHUNK_SIZE);

      for (const [index, batch] of chunks.entries()) {
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, CHUNK_PAUSE_MS));
        }

        try {
          const { error } = await resend.batch.send(
            batch.map((email) => ({
              from: config.from,
              to: email.to,
              subject: email.subject,
              html: email.html,
            })),
          );
          if (error) throw new Error(error.message);
          result.sent += batch.length;
        } catch (error) {
          // A rejected chunk must not abandon the chunks after it: the caller
          // reports exactly who did and did not receive the message, and an
          // operator who knows the four addresses that failed can act on it.
          // Throwing here would leave them guessing at the boundary.
          const reason =
            error instanceof Error ? error.message : "unknown error";
          for (const email of batch) {
            result.failed.push({ to: email.to, reason });
          }
        }
      }

      return result;
    },
  };
}

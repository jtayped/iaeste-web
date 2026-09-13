import { getDb } from "@repo/db/client";
import {
  createBroadcastRecipientRepository,
  type BroadcastAudience,
  type BroadcastRecipientRow,
} from "@repo/db/repositories";
import {
  personaliseBroadcast,
  type BroadcastContent,
  type BroadcastRecipient,
} from "@repo/constants/validators/broadcast";
import Broadcast from "@repo/email/broadcast";
import { renderEmail } from "@repo/email/render";
import { createResendEmailer, type Emailer } from "@repo/email/resend";

import { getEmailConfig } from "../config";
import "../lib/react-global";

let cachedEmailer: Emailer | undefined;
function defaultEmailer(): Emailer {
  cachedEmailer ??= createResendEmailer(getEmailConfig());
  return cachedEmailer;
}

/**
 * Stand-ins used when a preview has no real recipient to borrow from — an
 * empty audience, or a test send to the author's own address. Obviously
 * placeholder names, so nobody mistakes a preview for the real thing.
 */
const SAMPLE_RECIPIENT: BroadcastRecipient = {
  email: "exemple@alumnes.udl.cat",
  name: "Nom",
  surnames: "Cognoms",
};

export interface BroadcastRecipientsResult {
  total: number;
  sample: BroadcastRecipientRow[];
  truncated: boolean;
}

export interface BroadcastPreviewResult {
  html: string;
  subject: string;
  sampleRecipient: BroadcastRecipientRow | null;
}

export interface BroadcastSendResult {
  requested: number;
  sent: number;
  failed: { email: string; reason: string }[];
}

/** Thrown when an audience resolves to more addresses than the route allows. */
export class TooManyRecipientsError extends Error {
  constructor(readonly max: number) {
    super(`A broadcast can reach at most ${max} people.`);
    this.name = "TooManyRecipientsError";
  }
}

/**
 * Thrown when the audience no longer holds the number of people the composer
 * showed the operator. See `expectedRecipients` in the send contract.
 */
export class RecipientCountChangedError extends Error {
  constructor(
    readonly expected: number,
    readonly actual: number,
  ) {
    super(
      `The audience now holds ${actual} people, not the ${expected} that were confirmed.`,
    );
    this.name = "RecipientCountChangedError";
  }
}

export interface BroadcastService {
  recipients(
    audience: BroadcastAudience,
    options: { max: number; sampleSize: number },
  ): Promise<BroadcastRecipientsResult>;
  preview(
    content: BroadcastContent,
    options: { audience?: BroadcastAudience; max: number },
  ): Promise<BroadcastPreviewResult>;
  send(
    audience: BroadcastAudience,
    content: BroadcastContent,
    options: { max: number; expectedRecipients: number },
  ): Promise<BroadcastSendResult>;
  sendTest(
    content: BroadcastContent,
    recipient: BroadcastRecipient,
  ): Promise<void>;
}

export interface BroadcastServiceDependencies {
  emailer?: Emailer;
  db?: import("@repo/db/client").Database;
}

/**
 * The admin email composer's server half.
 *
 * Its one non-obvious property, and the reason preview and send share this
 * module: both render the *same* `Broadcast` component through the *same*
 * `render`, so the HTML an operator approves is byte-for-byte the HTML that
 * leaves the building. A preview that merely approximates the email is how a
 * mass send goes out with a broken link nobody saw.
 */
export function createBroadcastService(
  dependencies: BroadcastServiceDependencies = {},
): BroadcastService {
  const emailer = () => dependencies.emailer ?? defaultEmailer();
  const resolveDb = () => dependencies.db ?? getDb();

  /** Resolves an audience, refusing rather than truncating when it is too big. */
  async function resolve(
    audience: BroadcastAudience,
    max: number,
  ): Promise<BroadcastRecipientRow[]> {
    const rows = await createBroadcastRecipientRepository(
      resolveDb(),
    ).resolve(audience, max + 1);
    if (rows.length > max) throw new TooManyRecipientsError(max);
    return rows;
  }

  /**
   * One recipient's message, rendered. Placeholders are substituted before
   * rendering rather than after, so a name containing markdown characters
   * cannot smuggle formatting into the message body.
   */
  async function renderFor(
    content: BroadcastContent,
    recipient: BroadcastRecipient,
  ): Promise<{ subject: string; html: string }> {
    const personalised = personaliseBroadcast(content, recipient);
    return {
      subject: personalised.subject,
      html: await renderEmail(Broadcast(personalised)),
    };
  }

  return {
    async recipients(audience, { max, sampleSize }) {
      const rows = await resolve(audience, max);
      return {
        total: rows.length,
        sample: rows.slice(0, sampleSize),
        truncated: rows.length > sampleSize,
      };
    },

    async preview(content, { audience, max }) {
      const [first] = audience ? await resolve(audience, max) : [];
      const { subject, html } = await renderFor(content, first ?? SAMPLE_RECIPIENT);
      return { html, subject, sampleRecipient: first ?? null };
    },

    async send(audience, content, { max, expectedRecipients }) {
      const rows = await resolve(audience, max);
      if (rows.length !== expectedRecipients) {
        throw new RecipientCountChangedError(expectedRecipients, rows.length);
      }

      const messages = await Promise.all(
        rows.map(async (row) => {
          const { subject, html } = await renderFor(content, row);
          return { to: row.email, subject, html };
        }),
      );

      const result = await emailer().sendBatch(messages);
      return {
        requested: rows.length,
        sent: result.sent,
        failed: result.failed.map(({ to, reason }) => ({
          email: to,
          reason,
        })),
      };
    },

    async sendTest(content, recipient) {
      const personalised = personaliseBroadcast(content, recipient);
      // The single-send path, not the batch one: a test that fails must say
      // so loudly, and `send` reports failures rather than throwing them.
      await emailer().send({
        to: recipient.email,
        subject: `[prova] ${personalised.subject}`,
        react: Broadcast(personalised),
      });
    },
  };
}

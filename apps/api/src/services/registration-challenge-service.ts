import crypto from "node:crypto";

import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createEmailChallengeRepository,
  createKnownPersonRepository,
  MAX_CHALLENGE_ATTEMPTS,
  type KnownPerson,
} from "@repo/db/repositories";
import VerificationCode from "@repo/email/verification-code";
import { createResendEmailer, type Emailer } from "@repo/email/resend";

import { getEmailConfig } from "../config";
import { canSend, recordSend } from "../lib/rate-limit";
import { RegistrationsClosedError } from "../repositories/registrations";
import "../lib/react-global";

/**
 * Long enough to switch to a mail app, find the message and come back;
 * short enough that a code left on a shared screen goes stale quickly.
 */
export const CODE_TTL_MS = 10 * 60 * 1000;

/**
 * The session covers filling in the rest of the form. Generous, because a
 * returning member reading their own history and correcting a phone number
 * should never be timed out mid-sentence.
 */
export const SESSION_TTL_MS = 30 * 60 * 1000;

/** What the client is told to wait before offering "send it again". */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Codes are hashed with the address mixed in, so a stolen hash cannot be
 * replayed against a different inbox and two people who happen to be issued
 * the same six digits never collide.
 */
function hashCode(email: string, code: string): string {
  return crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");
}

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * `randomInt` rather than `Math.random`: this is the only secret standing
 * between a stranger and someone else's phone number and membership history.
 */
function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * The six digits, unseparated. The email spaces them out visually with letter
 * spacing, so a literal space here only rode along on copy-paste and landed in
 * the OTP field, pushing a digit off the end.
 */
function forDisplay(code: string): string {
  return code;
}

export interface RegistrationSession extends KnownPerson {
  token: string;
  expiresAt: Date;
  email: string;
}

export interface RegistrationChallengeService {
  /** Issues (or silently declines to reissue) a code. Never reveals which. */
  start(email: string): Promise<{ resendAfterSeconds: number }>;
  /** Trades a correct code for a session, or undefined for any failure. */
  verifyCode(
    email: string,
    code: string,
  ): Promise<RegistrationSession | undefined>;
  /** The address a live session stands for, without spending it. */
  resolveSession(token: string): Promise<string | undefined>;
  /** Spends the session. Returns the address only to the caller that spent it. */
  consumeSession(token: string): Promise<string | undefined>;
}

export interface RegistrationChallengeDependencies {
  emailer?: Emailer;
  db?: import("@repo/db/client").Database;
}

let cachedEmailer: Emailer | undefined;
function defaultEmailer(): Emailer {
  cachedEmailer ??= createResendEmailer(getEmailConfig());
  return cachedEmailer;
}

export function createRegistrationChallengeService(
  dependencies: RegistrationChallengeDependencies = {},
): RegistrationChallengeService {
  const emailer = () => dependencies.emailer ?? defaultEmailer();
  const resolveDb = () => dependencies.db ?? getDb();

  return {
    async start(rawEmail) {
      const email = rawEmail.trim().toLowerCase();
      const db = resolveDb();

      // The one thing this endpoint may reveal, because it is a property of
      // the committee's calendar rather than of the person asking.
      const openCampaign =
        await createCampaignRepository(db).getOpenForRegistration();
      if (!openCampaign) throw new RegistrationsClosedError();

      // Keyed by address, not IP: what needs protecting is one person's
      // inbox from a flood, and an address is the thing an attacker cannot
      // rotate while still being useful to them. Shares the resend limiter's
      // budget — a one-minute cooldown and five sends a day, which is the
      // same shape of protection the same inbox already gets.
      if (!canSend(`challenge:${email}`)) {
        return { resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
      }
      recordSend(`challenge:${email}`);

      const code = generateCode();
      await createEmailChallengeRepository(db).create({
        email,
        codeHash: hashCode(email, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      });

      try {
        await emailer().send({
          to: email,
          subject: "el teu codi d'inscripció · iaeste lc lleida",
          react: VerificationCode({
            email,
            code: forDisplay(code),
            expiresInMinutes: Math.round(CODE_TTL_MS / 60_000),
          }),
        });
      } catch (error) {
        // The challenge row stands and the person can ask for another code.
        // Failing the request here would tell a prober that this address is
        // one the mail provider rejects, which is itself a signal.
        console.error("Failed to send registration code email", error);
      }

      return { resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
    },

    async verifyCode(rawEmail, code) {
      const email = rawEmail.trim().toLowerCase();
      const db = resolveDb();
      const challenges = createEmailChallengeRepository(db);

      const challenge = await challenges.getActive(email);
      if (!challenge) return undefined;

      if (challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS) {
        await challenges.burn(challenge.id);
        return undefined;
      }

      // `timingSafeEqual` over the hashes rather than `===` over the codes.
      // Both are fixed-length hex here, so the lengths always match.
      const expected = Buffer.from(challenge.codeHash, "hex");
      const actual = Buffer.from(hashCode(email, code), "hex");
      const correct =
        expected.length === actual.length &&
        crypto.timingSafeEqual(expected, actual);

      if (!correct) {
        const updated = await challenges.recordAttempt(challenge.id);
        if (updated && updated.attemptCount >= MAX_CHALLENGE_ATTEMPTS) {
          await challenges.burn(challenge.id);
        }
        return undefined;
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      const consumed = await challenges.consume(challenge.id, {
        sessionTokenHash: hashSessionToken(token),
        sessionExpiresAt: expiresAt,
      });
      // Lost the race against another request carrying the same code. That
      // one holds the only session; this one has to start over.
      if (!consumed) return undefined;

      const known = await createKnownPersonRepository(db).lookup(email);
      return { token, expiresAt, email, ...known };
    },

    async resolveSession(token) {
      const row = await createEmailChallengeRepository(resolveDb()).getSession(
        hashSessionToken(token),
      );
      return row?.email;
    },

    async consumeSession(token) {
      const row = await createEmailChallengeRepository(
        resolveDb(),
      ).consumeSession(hashSessionToken(token));
      return row?.email;
    },
  };
}

export { RegistrationsClosedError };

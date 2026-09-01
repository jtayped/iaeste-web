import crypto from "node:crypto";

import type {
  MemberEmailKind,
  MemberEmails,
} from "@repo/constants/validators/member-email";
import { isUniversityEmail } from "@repo/constants/validators/member-email";
import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createEmailChallengeRepository,
  createKnownPersonRepository,
  createRegistrationDraftRepository,
  MAX_CHALLENGE_ATTEMPTS,
} from "@repo/db/repositories";
import RegistrationVerificationLink from "@repo/email/registration-verification-link";
import VerificationCode from "@repo/email/verification-code";
import { createResendEmailer, type Emailer } from "@repo/email/resend";

import {
  getEmailConfig,
  getInscripcionsPublicOrigin,
  getRuntimeEnvironment,
} from "../config";
import { canSend, recordSend } from "../lib/rate-limit";
import { RegistrationsClosedError } from "../repositories/registrations";
import {
  CODE_TTL_MS,
  formatRegistrationCode,
  generateRegistrationCode,
  hashRegistrationCode,
  maskRegistrationEmail,
  SESSION_TTL_MS,
} from "./registration-code";
import {
  isRegistrationDraftReady,
  type RegistrationDraftSession,
  toRegistrationDraftSession,
} from "./registration-draft-session";
import "../lib/react-global";

export const VERIFICATION_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESEND_COOLDOWN_SECONDS = 60;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface ResolvedRegistrationDraft extends MemberEmails {
  draftId: string;
}

export interface RegistrationChallengeService {
  start(email: string): Promise<{ resendAfterSeconds: number }>;
  verifyCode(
    email: string,
    code: string,
  ): Promise<RegistrationDraftSession | undefined>;
  verifyLink(token: string): Promise<RegistrationDraftSession | undefined>;
  resume(token: string): Promise<RegistrationDraftSession | undefined>;
  resendLink(token: string, kind: MemberEmailKind): Promise<void>;
  resolveSession(token: string): Promise<ResolvedRegistrationDraft | undefined>;
  consumeSession(token: string): Promise<boolean>;
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

  async function sendCode(email: string, code: string) {
    if (!dependencies.emailer && getRuntimeEnvironment() === "development") {
      console.info(`[registration OTP] ${email}: ${code}`);
      return;
    }

    try {
      await emailer().send({
        to: email,
        subject: "el teu codi d'inscripció · iaeste lc lleida",
        react: VerificationCode({
          email,
          code: formatRegistrationCode(code),
          expiresInMinutes: CODE_TTL_MS / 60_000,
        }),
      });
    } catch (error) {
      console.error("Failed to send registration code", error);
    }
  }

  async function sendLink(email: string, kind: MemberEmailKind, token: string) {
    const link = `${getInscripcionsPublicOrigin()}/formulari#token=${token}`;
    try {
      await emailer().send({
        to: email,
        subject: "confirma el teu correu · iaeste lc lleida",
        react: RegistrationVerificationLink({
          email,
          kind,
          link,
          expiresInDays: VERIFICATION_LINK_TTL_MS / 86_400_000,
        }),
      });
    } catch (error) {
      console.error("Failed to send registration verification link", error);
    }
  }

  async function toCodeSession(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<RegistrationDraftSession> {
    const known = await createKnownPersonRepository(resolveDb()).lookup(email);
    const verified = {
      maskedAddress: maskRegistrationEmail(email),
      verified: true,
    };
    return {
      token,
      expiresAt,
      ready: true,
      emails: isUniversityEmail(email)
        ? { university: verified }
        : { personal: verified },
      ...known,
    };
  }

  return {
    async start(rawEmail) {
      const email = rawEmail.trim().toLowerCase();
      const db = resolveDb();
      const campaign =
        await createCampaignRepository(db).getOpenForRegistration();
      if (!campaign) throw new RegistrationsClosedError();

      if (!canSend(`registration-code:${email}`)) {
        return { resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
      }
      recordSend(`registration-code:${email}`);

      const code = generateRegistrationCode();
      await createEmailChallengeRepository(db).create({
        email,
        codeHash: hashRegistrationCode(email, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      });
      await sendCode(email, code);
      return { resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
    },

    async verifyCode(rawEmail, code) {
      const email = rawEmail.trim().toLowerCase();
      const challenges = createEmailChallengeRepository(resolveDb());
      const challenge = await challenges.getActive(email);
      if (!challenge) return undefined;

      if (challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS) {
        await challenges.burn(challenge.id);
        return undefined;
      }

      const expected = Buffer.from(challenge.codeHash, "hex");
      const actual = Buffer.from(hashRegistrationCode(email, code), "hex");
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

      const token = newToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      const consumed = await challenges.consume(challenge.id, {
        sessionTokenHash: hashToken(token),
        sessionExpiresAt: expiresAt,
      });
      return consumed ? toCodeSession(email, token, expiresAt) : undefined;
    },

    async verifyLink(token) {
      const sessionToken = newToken();
      const expiresAt = new Date(Date.now() + VERIFICATION_LINK_TTL_MS);
      const loaded = await createRegistrationDraftRepository(
        resolveDb(),
      ).verify(hashToken(token), {
        tokenHash: hashToken(sessionToken),
        expiresAt,
      });
      return loaded
        ? toRegistrationDraftSession(resolveDb(), loaded, sessionToken)
        : undefined;
    },

    async resume(token) {
      const codeSession = await createEmailChallengeRepository(
        resolveDb(),
      ).getSession(hashToken(token));
      if (codeSession?.sessionExpiresAt) {
        return toCodeSession(
          codeSession.email,
          token,
          codeSession.sessionExpiresAt,
        );
      }

      const loaded = await createRegistrationDraftRepository(
        resolveDb(),
      ).resolveSession(hashToken(token));
      return loaded
        ? toRegistrationDraftSession(resolveDb(), loaded, token)
        : undefined;
    },

    async resendLink(token, kind) {
      const db = resolveDb();
      const drafts = createRegistrationDraftRepository(db);
      const loaded = await drafts.resolveSession(hashToken(token));
      if (!loaded) return;
      const row = kind === "university" ? loaded.university : loaded.personal;
      // No row for this kind means it was never supplied at `start` — nothing
      // to resend.
      if (!row || row.verifiedAt || !canSend(`draft:${row.email}`)) return;
      recordSend(`draft:${row.email}`);
      const verificationToken = newToken();
      const rotated = await drafts.rotateVerification(loaded.draft.id, kind, {
        tokenHash: hashToken(verificationToken),
        expiresAt: new Date(Date.now() + VERIFICATION_LINK_TTL_MS),
      });
      if (rotated) await sendLink(row.email, kind, verificationToken);
    },

    async resolveSession(token) {
      const codeSession = await createEmailChallengeRepository(
        resolveDb(),
      ).getSession(hashToken(token));
      if (codeSession) {
        return {
          draftId: codeSession.id,
          ...(isUniversityEmail(codeSession.email)
            ? { universityEmail: codeSession.email }
            : { personalEmail: codeSession.email }),
        };
      }

      const loaded = await createRegistrationDraftRepository(
        resolveDb(),
      ).resolveSession(hashToken(token));
      if (!loaded || !isRegistrationDraftReady(loaded)) return undefined;
      return {
        draftId: loaded.draft.id,
        universityEmail: loaded.university?.email,
        personalEmail: loaded.personal?.email,
      };
    },

    async consumeSession(token) {
      const consumedCodeSession = await createEmailChallengeRepository(
        resolveDb(),
      ).consumeSession(hashToken(token));
      if (consumedCodeSession) return true;

      const loaded = await createRegistrationDraftRepository(
        resolveDb(),
      ).resolveSession(hashToken(token));
      if (!loaded) return false;
      return Boolean(
        await createRegistrationDraftRepository(resolveDb()).markSubmitted(
          loaded.draft.id,
        ),
      );
    },
  };
}

export { RegistrationsClosedError };

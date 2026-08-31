import crypto from "node:crypto";

import type {
  MemberEmailKind,
  MemberEmails,
} from "@repo/constants/validators/member-email";
import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createKnownPersonRepository,
  createRegistrationDraftRepository,
  type KnownPerson,
} from "@repo/db/repositories";
import RegistrationVerificationLink from "@repo/email/registration-verification-link";
import { createResendEmailer, type Emailer } from "@repo/email/resend";

import { getEmailConfig, getInscripcionsPublicOrigin } from "../config";
import { canSend, recordSend } from "../lib/rate-limit";
import { RegistrationsClosedError } from "../repositories/registrations";
import "../lib/react-global";

export const VERIFICATION_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const RESEND_COOLDOWN_SECONDS = 60;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export interface RegistrationDraftSession extends KnownPerson {
  token: string;
  expiresAt: Date;
  ready: boolean;
  /** Only the kind(s) actually supplied at `start` are keys here. */
  emails: Partial<
    Record<MemberEmailKind, { maskedAddress: string; verified: boolean }>
  >;
}

export interface ResolvedRegistrationDraft extends MemberEmails {
  draftId: string;
}

export interface RegistrationChallengeService {
  start(emails: MemberEmails): Promise<{ resendAfterSeconds: number }>;
  verifyLink(token: string): Promise<RegistrationDraftSession | undefined>;
  resume(token: string): Promise<RegistrationDraftSession | undefined>;
  resend(token: string, kind: MemberEmailKind): Promise<void>;
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

  type LoadedDraft = NonNullable<
    Awaited<
      ReturnType<
        ReturnType<typeof createRegistrationDraftRepository>["resolveSession"]
      >
    >
  >;

  /** The row(s) actually present on this draft — one kind, or both. */
  function presentRows(loaded: LoadedDraft) {
    return ([loaded.university, loaded.personal] as const).filter(
      (row): row is NonNullable<typeof row> => Boolean(row),
    );
  }

  /** Ready once every address supplied at `start` — one or two — is verified. */
  function isReady(loaded: LoadedDraft): boolean {
    const rows = presentRows(loaded);
    return rows.length > 0 && rows.every((row) => Boolean(row.verifiedAt));
  }

  async function toSession(
    loaded: LoadedDraft,
    token: string,
  ): Promise<RegistrationDraftSession> {
    const ready = isReady(loaded);
    const rows = presentRows(loaded);
    const sessionHash = hashToken(token);
    const sessionRow = rows.find((row) => row.sessionTokenHash === sessionHash);
    const known = ready
      ? await createKnownPersonRepository(resolveDb()).lookupEmails(
          rows.map((row) => row.email),
        )
      : {
          known: false,
          profile: null,
          memberships: [],
          openCampaignRegistrationStatus: null,
        };

    const emails: RegistrationDraftSession["emails"] = {};
    if (loaded.university) {
      emails.university = {
        maskedAddress: maskEmail(loaded.university.email),
        verified: Boolean(loaded.university.verifiedAt),
      };
    }
    if (loaded.personal) {
      emails.personal = {
        maskedAddress: maskEmail(loaded.personal.email),
        verified: Boolean(loaded.personal.verifiedAt),
      };
    }

    return {
      token,
      expiresAt: sessionRow?.sessionExpiresAt ?? loaded.draft.expiresAt,
      ready,
      emails,
      ...known,
    };
  }

  return {
    async start(rawEmails) {
      // At least one is guaranteed by `memberEmailsSchema` upstream — this
      // only trims/lowercases whichever kind(s) were actually supplied.
      const kinds = (["university", "personal"] as const).flatMap((kind) => {
        const raw =
          kind === "university"
            ? rawEmails.universityEmail
            : rawEmails.personalEmail;
        return raw ? [{ kind, email: raw.trim().toLowerCase() }] : [];
      });

      const db = resolveDb();
      const campaign =
        await createCampaignRepository(db).getOpenForRegistration();
      if (!campaign) throw new RegistrationsClosedError();

      if (!kinds.every(({ email }) => canSend(`draft:${email}`))) {
        return { resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
      }
      for (const { email } of kinds) recordSend(`draft:${email}`);

      const tokenExpiresAt = new Date(Date.now() + VERIFICATION_LINK_TTL_MS);
      const withTokens = kinds.map(({ kind, email }) => ({
        kind,
        email,
        token: newToken(),
      }));
      await createRegistrationDraftRepository(db).create({
        campaignId: campaign.id,
        expiresAt: new Date(Date.now() + DRAFT_TTL_MS),
        emails: Object.fromEntries(
          withTokens.map(({ kind, email, token }) => [
            kind,
            { email, tokenHash: hashToken(token), tokenExpiresAt },
          ]),
        ),
      });

      await Promise.all(
        withTokens.map(({ email, kind, token }) =>
          sendLink(email, kind, token),
        ),
      );
      return { resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
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
      return loaded ? toSession(loaded, sessionToken) : undefined;
    },

    async resume(token) {
      const loaded = await createRegistrationDraftRepository(
        resolveDb(),
      ).resolveSession(hashToken(token));
      return loaded ? toSession(loaded, token) : undefined;
    },

    async resend(token, kind) {
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
      const loaded = await createRegistrationDraftRepository(
        resolveDb(),
      ).resolveSession(hashToken(token));
      if (!loaded || !isReady(loaded)) return undefined;
      return {
        draftId: loaded.draft.id,
        universityEmail: loaded.university?.email,
        personalEmail: loaded.personal?.email,
      };
    },

    async consumeSession(token) {
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

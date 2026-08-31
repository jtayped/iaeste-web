import { and, eq, gt, isNull } from "drizzle-orm";

import type { Database, Db } from "../client";
import {
  registrationDraft,
  registrationDraftEmail,
} from "../schema/registration-draft";
import { firstOrThrow } from "./util";

export type DraftEmailKind = "university" | "personal";

/** At least one kind — a draft with neither never exists. */
export type DraftEmailInput = Partial<
  Record<
    DraftEmailKind,
    { email: string; tokenHash: string; tokenExpiresAt: Date }
  >
>;

export interface CreateRegistrationDraftInput {
  campaignId: string;
  expiresAt: Date;
  emails: DraftEmailInput;
}

async function loadDraft(db: Db, draftId: string) {
  const [draft] = await db
    .select()
    .from(registrationDraft)
    .where(eq(registrationDraft.id, draftId));
  if (!draft) return undefined;
  const emails = await db
    .select()
    .from(registrationDraftEmail)
    .where(eq(registrationDraftEmail.draftId, draftId));
  const university = emails.find((row) => row.kind === "university");
  const personal = emails.find((row) => row.kind === "personal");
  if (!university && !personal) return undefined;
  return { draft, university, personal };
}

export function createRegistrationDraftRepository(db: Database) {
  return {
    async create(input: CreateRegistrationDraftInput) {
      const provided = (["university", "personal"] as const).flatMap((kind) => {
        const entry = input.emails[kind];
        return entry ? [{ kind, ...entry }] : [];
      });
      return db.transaction(async (tx) => {
        const draft = firstOrThrow(
          await tx
            .insert(registrationDraft)
            .values({
              campaignId: input.campaignId,
              expiresAt: input.expiresAt,
            })
            .returning(),
        );
        await tx.insert(registrationDraftEmail).values(
          provided.map(({ kind, email, tokenHash, tokenExpiresAt }) => ({
            draftId: draft.id,
            kind,
            email: email.trim().toLowerCase(),
            verificationTokenHash: tokenHash,
            verificationExpiresAt: tokenExpiresAt,
          })),
        );
        return firstOrThrow([await loadDraft(tx, draft.id)]);
      });
    },

    async verify(
      tokenHash: string,
      session: { tokenHash: string; expiresAt: Date },
    ) {
      const [emailRow] = await db
        .select()
        .from(registrationDraftEmail)
        .where(
          and(
            eq(registrationDraftEmail.verificationTokenHash, tokenHash),
            isNull(registrationDraftEmail.verifiedAt),
            gt(registrationDraftEmail.verificationExpiresAt, new Date()),
          ),
        );
      if (!emailRow) return undefined;

      const [updated] = await db
        .update(registrationDraftEmail)
        .set({
          verifiedAt: new Date(),
          sessionTokenHash: session.tokenHash,
          sessionExpiresAt: session.expiresAt,
        })
        .where(
          and(
            eq(registrationDraftEmail.id, emailRow.id),
            isNull(registrationDraftEmail.verifiedAt),
            gt(registrationDraftEmail.verificationExpiresAt, new Date()),
          ),
        )
        .returning();
      if (!updated) return undefined;
      return loadDraft(db, updated.draftId);
    },

    async resolveSession(sessionTokenHash: string) {
      const [emailRow] = await db
        .select()
        .from(registrationDraftEmail)
        .where(
          and(
            eq(registrationDraftEmail.sessionTokenHash, sessionTokenHash),
            gt(registrationDraftEmail.sessionExpiresAt, new Date()),
          ),
        );
      if (!emailRow) return undefined;
      const loaded = await loadDraft(db, emailRow.draftId);
      if (
        !loaded ||
        loaded.draft.submittedAt ||
        loaded.draft.expiresAt <= new Date()
      ) {
        return undefined;
      }
      return loaded;
    },

    async markSubmitted(draftId: string) {
      const [row] = await db
        .update(registrationDraft)
        .set({ submittedAt: new Date() })
        .where(
          and(
            eq(registrationDraft.id, draftId),
            isNull(registrationDraft.submittedAt),
          ),
        )
        .returning();
      return row;
    },

    async rotateVerification(
      draftId: string,
      kind: DraftEmailKind,
      input: { tokenHash: string; expiresAt: Date },
    ) {
      const [row] = await db
        .update(registrationDraftEmail)
        .set({
          verificationTokenHash: input.tokenHash,
          verificationExpiresAt: input.expiresAt,
        })
        .where(
          and(
            eq(registrationDraftEmail.draftId, draftId),
            eq(registrationDraftEmail.kind, kind),
            isNull(registrationDraftEmail.verifiedAt),
          ),
        )
        .returning();
      return row;
    },
  };
}

export type RegistrationDraftRepository = ReturnType<
  typeof createRegistrationDraftRepository
>;

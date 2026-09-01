import crypto from "node:crypto";

import type { MemberEmailKind } from "@repo/constants/validators/member-email";
import type { Database } from "@repo/db/client";
import {
  createKnownPersonRepository,
  createRegistrationDraftRepository,
  type KnownPerson,
} from "@repo/db/repositories";

import { maskRegistrationEmail } from "./registration-code";

export interface RegistrationDraftSession extends KnownPerson {
  token: string;
  expiresAt: Date;
  ready: boolean;
  emails: Partial<
    Record<MemberEmailKind, { maskedAddress: string; verified: boolean }>
  >;
}

export type LoadedRegistrationDraft = NonNullable<
  Awaited<
    ReturnType<
      ReturnType<typeof createRegistrationDraftRepository>["resolveSession"]
    >
  >
>;

function presentRows(loaded: LoadedRegistrationDraft) {
  return ([loaded.university, loaded.personal] as const).filter(
    (row): row is NonNullable<typeof row> => Boolean(row),
  );
}

export function isRegistrationDraftReady(
  loaded: LoadedRegistrationDraft,
): boolean {
  const rows = presentRows(loaded);
  return rows.length > 0 && rows.every((row) => Boolean(row.verifiedAt));
}

export async function toRegistrationDraftSession(
  db: Database,
  loaded: LoadedRegistrationDraft,
  token: string,
): Promise<RegistrationDraftSession> {
  const ready = isRegistrationDraftReady(loaded);
  const rows = presentRows(loaded);
  const sessionHash = crypto.createHash("sha256").update(token).digest("hex");
  const sessionRow = rows.find((row) => row.sessionTokenHash === sessionHash);
  const known = ready
    ? await createKnownPersonRepository(db).lookupEmails(
        rows.map((row) => row.email),
      )
    : {
        known: false,
        profile: null,
        memberships: [],
        openCampaignRegistrationStatus: null,
        willAutoAccept: false,
      };

  const emails: RegistrationDraftSession["emails"] = {};
  if (loaded.university) {
    emails.university = {
      maskedAddress: maskRegistrationEmail(loaded.university.email),
      verified: Boolean(loaded.university.verifiedAt),
    };
  }
  if (loaded.personal) {
    emails.personal = {
      maskedAddress: maskRegistrationEmail(loaded.personal.email),
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

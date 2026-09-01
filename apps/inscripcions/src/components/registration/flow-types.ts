import type { EmailStepValues } from "@/lib/form-schema";
import type { Session } from "@/lib/registration-flow";

import type { DetailsContext } from "./details-step";
import type { VerificationEmails } from "./verification-step";

export type Mode = { kind: "public" } | { kind: "invitation" };

export type Stage =
  | { kind: "loadingInvitation" }
  | { kind: "loadingDraft" }
  | { kind: "invalidInvitation" }
  | { kind: "invalidDraft" }
  | { kind: "identityConflict" }
  | { kind: "rateLimited"; retry: () => void }
  | { kind: "unreachable"; retry: () => void }
  | { kind: "email" }
  | {
      kind: "verification";
      method: "code";
      email: string;
    }
  | {
      kind: "verification";
      method: "link" | "complete";
      emails: VerificationEmails;
      session: Session;
    }
  | { kind: "membership"; session: Session }
  | { kind: "details"; context: DetailsContext; session?: Session }
  | { kind: "accepted"; alreadyMember: boolean };

/** The single address starts blank and stays available when navigating back. */
export const EMPTY_EMAIL: EmailStepValues = { email: "" };

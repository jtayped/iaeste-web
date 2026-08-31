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
      emails: VerificationEmails;
      session?: Session;
    }
  | { kind: "details"; context: DetailsContext }
  | { kind: "accepted"; alreadyMember: boolean };

/**
 * Both inputs start blank, and blank is a legitimate value for either one of
 * them now: the pair only has to carry one address between the two.
 */
export const EMPTY_EMAILS: EmailStepValues = {
  universityEmail: "",
  personalEmail: "",
};

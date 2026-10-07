import {
  CAMPAIGN_STATE_LABELS,
  invitationStatusLabel,
  MEMBER_TARGET_STATE_LABELS,
  membershipStatusLabel,
  REGISTRATION_STATUS_LABELS,
} from "@repo/constants/admin-labels";

import type {
  CampaignState,
  InvitationStatusFilter,
  InvitationRole,
  MemberTargetState,
  RegistrationStatus,
} from "@/lib/admin-types";

export { roleLabel } from "@repo/constants/admin-labels";

/**
 * Every enum the API returns, in lowercase Catalan, plus the badge tone it
 * should carry. The words come from `@repo/constants/admin-labels`, which the
 * API also writes into CSV exports, so a status is never called one thing on a
 * badge and another in the file downloaded from the same screen. The tones are
 * this app's alone.
 *
 * How loud a status is allowed to be:
 *
 * - `secondary` is IAESTE blue and belongs to the one thing on the screen that
 *   *does* something — the invite button, the submit. A status is read, never
 *   clicked, so no status uses it.
 * - `default` is for the state the operator can act on right now (a pending
 *   invitation, a queue entry waiting for review).
 * - `destructive` is for a state that needs someone to intervene, not for one
 *   that merely ended badly: an invitation timing out is the expected end of an
 *   invitation, and a page of red badges says "everything is broken".
 * - `outline` is everything else, which is most of it.
 */

/** Maps onto `@repo/ui/badge`'s variants, with a fifth "quiet" case. */
export type Tone = "default" | "secondary" | "destructive" | "outline";

export interface Labelled {
  label: string;
  tone: Tone;
}

const REGISTRATION_TONES: Record<RegistrationStatus, Tone> = {
  pending_email: "outline",
  pending_review: "default",
  accepted: "outline",
  rejected: "destructive",
};

/** The short form used on tab triggers, where the full sentence does not fit. */
export const REGISTRATION_TAB_LABELS: Record<RegistrationStatus, string> = {
  pending_email: "sense verificar",
  pending_review: "per revisar",
  accepted: "acceptades",
  rejected: "rebutjades",
};

export function registrationStatus(status: RegistrationStatus): Labelled {
  return {
    label: REGISTRATION_STATUS_LABELS[status],
    tone: REGISTRATION_TONES[status],
  };
}

const CAMPAIGN_STATE_TONES: Record<CampaignState, Tone> = {
  draft: "outline",
  published: "default",
  archived: "outline",
};

export function campaignState(state: CampaignState): Labelled {
  return {
    label: CAMPAIGN_STATE_LABELS[state],
    tone: CAMPAIGN_STATE_TONES[state],
  };
}

/** `membership.status`, typed as a plain string by the generated client. */
const MEMBERSHIP_TONES: Record<string, Tone> = {
  active: "default",
  left: "outline",
  kicked: "destructive",
};

export function membershipStatus(status: string): Labelled {
  return {
    label: membershipStatusLabel(status),
    tone: MEMBERSHIP_TONES[status] ?? "outline",
  };
}

const MEMBER_TARGET_TONES: Record<MemberTargetState, Tone> = {
  eligible: "default",
  member: "outline",
  registered: "outline",
  invited: "outline",
};

export function memberTargetState(status: MemberTargetState): Labelled {
  return {
    label: MEMBER_TARGET_STATE_LABELS[status],
    tone: MEMBER_TARGET_TONES[status],
  };
}

/**
 * Not a status the API returns: the absence of one. Two words rather than
 * three because this badge shares a column with one-word ones, and the row it
 * wraps in is the row that breaks the table's horizontal rhythm.
 */
const NO_MEMBERSHIP: Labelled = { label: "sense alta", tone: "outline" };

/**
 * The single status a member row carries.
 *
 * The question that screen asks is "can I invite this person to the campaign
 * I picked", and `targetState` answers exactly that — a membership status
 * beside it is the same fact twice, in two different shapes, competing for one
 * glance. Without a target campaign there is nothing to be eligible for, so the
 * membership itself is the status.
 */
export function memberRowStatus(row: {
  currentStatus: string | null;
  targetState: MemberTargetState | null;
}): Labelled {
  if (row.targetState !== null) return memberTargetState(row.targetState);
  if (row.currentStatus !== null) return membershipStatus(row.currentStatus);
  return NO_MEMBERSHIP;
}

/** `membership_event.event_type`, the audit log's verbs. */
const EVENT_LABELS: Record<string, string> = {
  joined: "alta",
  renewed: "renovació",
  left: "baixa",
  kicked: "expulsió",
  restored: "readmissió",
  invited: "convidat",
  role_changed: "canvi de rol",
};

export function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

/** Keyed by the state the badge shows, so `expired` is one of them. */
const INVITATION_TONES: Record<string, Tone> = {
  pending: "default",
  accepted: "outline",
  cancelled: "outline",
  expired: "outline",
};

export const INVITATION_FILTER_STATUSES = [
  "all",
  "pending",
  "accepted",
  "cancelled",
  "expired",
] as const satisfies readonly InvitationStatusFilter[];

export const INVITATION_FILTER_LABELS: Record<InvitationStatusFilter, string> =
  {
    all: "tots",
    pending: "pendents",
    accepted: "acceptats",
    cancelled: "anul·lats",
    expired: "caducats",
  };

/**
 * `expired` is a separate boolean on the row rather than a status of its own,
 * because a cancelled invitation can also be past its expiry and the reason it
 * is dead is the cancellation.
 */
export function invitationStatus(status: string, expired: boolean): Labelled {
  const shown = status === "pending" && expired ? "expired" : status;
  return {
    label: invitationStatusLabel(status, expired),
    tone: INVITATION_TONES[shown] ?? "outline",
  };
}

export const INVITATION_ROLES = [
  "member",
  "admin",
] as const satisfies readonly InvitationRole[];

/**
 * Particles that stay lowercase inside a name — `Maria de los Angeles`, not
 * `Maria De Los Angeles`. Never applied to the first word, which is a name
 * even when it is spelled like a particle.
 */
const NAME_PARTICLES = new Set([
  "de",
  "del",
  "dels",
  "des",
  "la",
  "las",
  "les",
  "los",
  "el",
  "els",
  "i",
  "y",
  "da",
  "das",
  "do",
  "dos",
  "du",
  "van",
  "von",
  "der",
  "den",
  "al",
  "bin",
  "ben",
]);

/** Capitalises after the start, a hyphen, and the `d'`/`l'` elisions. */
function capitalise(word: string): string {
  return word
    .toLocaleLowerCase("ca")
    .replace(
      /(^|[-'’])(\p{L})/gu,
      (_match, boundary: string, letter: string) =>
        `${boundary}${letter.toLocaleUpperCase("ca")}`,
    );
}

/**
 * A person's name as it should be read, not as it was typed.
 *
 * The public form takes whatever the applicant puts in it, so `joel`, `MARIA`
 * and `Maria de los Angeles` end up in the same column. This app's chrome is
 * lowercase on purpose, but a name is data rather than chrome — it is cased
 * here, on display, and never written back.
 */
export function personName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && NAME_PARTICLES.has(word.toLocaleLowerCase("ca"))
        ? word.toLocaleLowerCase("ca")
        : capitalise(word),
    )
    .join(" ");
}

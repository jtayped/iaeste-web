import type {
  CampaignState,
  InvitationStatusFilter,
  InvitationRole,
  RegistrationStatus,
} from "@/lib/admin-types";

/**
 * Every enum the API returns, in lowercase Catalan, plus the badge tone it
 * should carry. Defined once here so the same status is never called two
 * things on two screens.
 */

/** Maps onto `@repo/ui/badge`'s variants, with a fifth "quiet" case. */
export type Tone = "default" | "secondary" | "destructive" | "outline";

export interface Labelled {
  label: string;
  tone: Tone;
}

export const REGISTRATION_STATUSES = [
  "pending_email",
  "pending_review",
  "accepted",
  "rejected",
] as const satisfies readonly RegistrationStatus[];

const REGISTRATION_LABELS: Record<RegistrationStatus, Labelled> = {
  pending_email: { label: "correu sense verificar", tone: "outline" },
  pending_review: { label: "per revisar", tone: "default" },
  accepted: { label: "acceptada", tone: "secondary" },
  rejected: { label: "rebutjada", tone: "destructive" },
};

/** The short form used on tab triggers, where the full sentence does not fit. */
export const REGISTRATION_TAB_LABELS: Record<RegistrationStatus, string> = {
  pending_email: "sense verificar",
  pending_review: "per revisar",
  accepted: "acceptades",
  rejected: "rebutjades",
};

export function registrationStatus(status: RegistrationStatus): Labelled {
  return REGISTRATION_LABELS[status];
}

const CAMPAIGN_STATE_LABELS: Record<CampaignState, Labelled> = {
  draft: { label: "esborrany", tone: "outline" },
  published: { label: "publicada", tone: "secondary" },
  archived: { label: "arxivada", tone: "outline" },
};

export function campaignState(state: CampaignState): Labelled {
  return CAMPAIGN_STATE_LABELS[state];
}

/** `membership.status`, typed as a plain string by the generated client. */
const MEMBERSHIP_LABELS: Record<string, Labelled> = {
  active: { label: "activa", tone: "default" },
  left: { label: "baixa", tone: "outline" },
  kicked: { label: "expulsat", tone: "destructive" },
};

export function membershipStatus(status: string): Labelled {
  return MEMBERSHIP_LABELS[status] ?? { label: status, tone: "outline" };
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

const INVITATION_LABELS: Record<string, Labelled> = {
  pending: { label: "pendent", tone: "default" },
  accepted: { label: "acceptat", tone: "secondary" },
  cancelled: { label: "anul·lat", tone: "outline" },
  expired: { label: "caducat", tone: "destructive" },
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
  if (status === "pending" && expired) {
    return INVITATION_LABELS.expired as Labelled;
  }
  return INVITATION_LABELS[status] ?? { label: status, tone: "outline" };
}

const ROLE_LABELS: Record<string, string> = {
  member: "membre",
  admin: "administrador",
};

export function roleLabel(role: string | null): string {
  if (role === null) return "sense rol";
  return ROLE_LABELS[role] ?? role;
}

export const INVITATION_ROLES = [
  "member",
  "admin",
] as const satisfies readonly InvitationRole[];

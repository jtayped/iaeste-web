import type {
  CampaignState,
  InvitationStatusFilter,
  MemberTargetState,
  RegistrationStatus,
} from "../validators/admin-list";

/**
 * The Catalan name of every enum the admin shows, lowercase like the rest of
 * the admin chrome.
 *
 * The admin app puts these on badges and the API writes them into CSV
 * exports. Both read them from here, so a status is never called one thing
 * on screen and another in the file downloaded from the same screen.
 */

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending_email: "correu sense verificar",
  pending_review: "per revisar",
  accepted: "acceptada",
  rejected: "rebutjada",
};

export const CAMPAIGN_STATE_LABELS: Record<CampaignState, string> = {
  draft: "esborrany",
  published: "publicada",
  archived: "arxivada",
};

export const MEMBER_TARGET_STATE_LABELS: Record<MemberTargetState, string> = {
  eligible: "per convidar",
  member: "ja és membre",
  registered: "inscripció enviada",
  invited: "ja convidat",
};

/** `expired` is never stored: it is `pending` past `expiresAt`. */
export const INVITATION_STATUS_LABELS: Record<
  Exclude<InvitationStatusFilter, "all">,
  string
> = {
  pending: "pendent",
  accepted: "acceptat",
  cancelled: "anul·lat",
  expired: "caducat",
};

/**
 * `membership.status` reaches the admin as a plain string, so an unknown
 * value is shown as itself rather than dropped.
 */
const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "activa",
  left: "baixa",
  kicked: "expulsat",
};

export function membershipStatusLabel(status: string): string {
  return MEMBERSHIP_STATUS_LABELS[status] ?? status;
}

/** A member with no membership in the current campaign. */
export const NO_CURRENT_MEMBERSHIP_LABEL = "sense alta activa";

/**
 * A cancelled invitation can also be past its expiry; the reason it is dead
 * is the cancellation, so only a pending one reads as expired.
 */
export function invitationStatusLabel(
  status: string,
  expired: boolean,
): string {
  if (status === "pending" && expired) return INVITATION_STATUS_LABELS.expired;
  return (
    INVITATION_STATUS_LABELS[status as keyof typeof INVITATION_STATUS_LABELS] ??
    status
  );
}

const ROLE_LABELS: Record<string, string> = {
  member: "membre",
  admin: "administrador",
};

export function roleLabel(role: string | null): string {
  if (role === null) return "sense rol";
  return ROLE_LABELS[role] ?? role;
}

import type { components } from "@repo/api-client";

/**
 * The admin response shapes, named once from the generated client.
 *
 * Every page imports its types from here rather than reaching into
 * `components["schemas"]` inline, so a schema rename shows up as one failing
 * file instead of a dozen.
 */
export type RegistrationStatus = components["schemas"]["RegistrationStatus"];
export type AdminRegistration = components["schemas"]["AdminRegistration"];
export type AdminRegistrationList =
  components["schemas"]["AdminRegistrationList"];
export type AdminRegistrationDetail =
  components["schemas"]["AdminRegistrationDetail"];
export type AdminRegistrationProfileSnapshot =
  components["schemas"]["AdminRegistrationProfileSnapshot"];
export type AdminPriorMembership =
  components["schemas"]["AdminPriorMembership"];
export type AdminDuplicateRegistration =
  components["schemas"]["AdminDuplicateRegistration"];

export type CampaignState = components["schemas"]["CampaignState"];
export type AdminCampaign = components["schemas"]["AdminCampaign"];
export type AdminCampaignList = components["schemas"]["AdminCampaignList"];
export type AdminCampaignWithCounts =
  components["schemas"]["AdminCampaignWithCounts"];

export type AdminMemberListItem = components["schemas"]["AdminMemberListItem"];
export type AdminMemberList = components["schemas"]["AdminMemberList"];
export type MemberTargetState = NonNullable<
  components["schemas"]["MemberTargetState"]
>;
export type AdminMemberDetail = components["schemas"]["AdminMemberDetail"];
export type AdminMemberProfile = components["schemas"]["AdminMemberProfile"];
export type AdminMemberEmails = components["schemas"]["AdminMemberEmails"];
/** One slot of the dual-email pair. `null` when that address is not set. */
export type AdminMemberEmail = components["schemas"]["AdminMemberEmail"];
export type AdminSetMemberEmailsRequest =
  components["schemas"]["AdminSetMemberEmailsRequest"];
export type AdminOwnProfile = components["schemas"]["AdminOwnProfile"];
export type AdminUpdateOwnProfileRequest =
  components["schemas"]["AdminUpdateOwnProfileRequest"];
export type AdminMemberTimelineMembership =
  components["schemas"]["AdminMemberTimelineMembership"];
export type AdminMemberTimelineEvent =
  components["schemas"]["AdminMemberTimelineEvent"];

/**
 * The broadcast composer's shapes. `BroadcastContent` is the wire type; the
 * rules it must satisfy live in `@repo/constants/validators/broadcast`, which
 * is what the composer validates against before it posts anything.
 */
export type BroadcastAudience = components["schemas"]["BroadcastAudience"];
export type BroadcastContent = components["schemas"]["BroadcastContent"];
export type BroadcastRecipients = components["schemas"]["BroadcastRecipients"];
/** One resolved person: the row id plus the placeholder inputs. */
export type BroadcastRecipient = BroadcastRecipients["sample"][number];
export type BroadcastPreview = components["schemas"]["BroadcastPreview"];
export type BroadcastSendResponse =
  components["schemas"]["BroadcastSendResponse"];
export type BroadcastTestResponse =
  components["schemas"]["BroadcastTestResponse"];
/** `{ email, reason }` — what a partially failed send or accept reports. */
export type BroadcastFailure = BroadcastSendResponse["failed"][number];

export type AdminBulkAcceptRegistrationsResponse =
  components["schemas"]["AdminBulkAcceptRegistrationsResponse"];

export type AdminInvitation = components["schemas"]["AdminInvitation"];
export type AdminInvitationList = components["schemas"]["AdminInvitationList"];
export type AdminBulkCreateInvitationsResponse =
  components["schemas"]["AdminBulkCreateInvitationsResponse"];
export type InvitationRole = components["schemas"]["InvitationRole"];

/** `GET /v1/admin/invitations`'s optional `status` query parameter. */
export type InvitationStatusFilter =
  "all" | "pending" | "accepted" | "cancelled" | "expired";

/** `GET /v1/admin/members`'s `filter` query parameter. */
export type MemberFilter = "all" | "current" | "past";

/** The role a member can hold. `null` on a user with no explicit role. */
export type MemberRole = "member" | "admin";

/** Full name from any of the shapes that carry a split name. */
export function fullName(person: { name: string; surnames: string }): string {
  return `${person.name} ${person.surnames}`.trim();
}

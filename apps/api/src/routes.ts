import { createRoute } from "@hono/zod-openapi";

import {
  adminAcceptBodySchema,
  adminCampaignListSchema,
  adminCampaignListQuerySchema,
  adminCampaignRegistrationBodySchema,
  adminCampaignSchema,
  adminCreateCampaignBodySchema,
  adminOverviewSchema,
  pushPublicKeySchema,
  pushSubscribeBodySchema,
  pushSubscribeResponseSchema,
  pushUnsubscribeBodySchema,
  pushUnsubscribeResponseSchema,
  adminCreateInvitationBodySchema,
  adminInvitationActionResponseSchema,
  adminInvitationListQuerySchema,
  adminInvitationListSchema,
  adminInvitationSchema,
  adminDeleteMemberResponseSchema,
  adminKickBodySchema,
  adminLeaveBodySchema,
  adminMemberDetailSchema,
  adminMemberEmailsResponseSchema,
  adminMemberListQuerySchema,
  adminMemberListSchema,
  adminMemberStatusResponseSchema,
  adminSetMemberEmailsBodySchema,
  adminRegistrationDetailSchema,
  adminRestoreResponseSchema,
  adminSetRoleBodySchema,
  adminSetRoleResponseSchema,
  invitationAcceptBodySchema,
  invitationAcceptResponseSchema,
  invitationIdParamSchema,
  invitationLookupBodySchema,
  invitationLookupResponseSchema,
  userIdParamSchema,
  adminUpdateCampaignBodySchema,
  campaignIdParamSchema,
  adminAcceptResponseSchema,
  adminListQuerySchema,
  adminRegistrationListSchema,
  adminRejectBodySchema,
  adminRejectResponseSchema,
  apiErrorSchema,
  healthSchema,
  registrationCreatedSchema,
  registrationIdParamSchema,
  registrationRequestSchema,
  registrationSessionSchema,
  registrationStartBodySchema,
  registrationStartResponseSchema,
  registrationDraftTokenBodySchema,
  registrationDraftResendBodySchema,
  publicRegistrationStatusSchema,
  resendVerificationResponseSchema,
  verifiedSchema,
  verifyTokenBodySchema,
  verifyTokenQuerySchema,
} from "./contracts";

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  operationId: "getHealth",
  tags: ["System"],
  responses: {
    200: {
      description: "The API is available.",
      content: {
        "application/json": { schema: healthSchema },
      },
    },
  },
});

export const registrationStatusRoute = createRoute({
  method: "get",
  path: "/v1/registrations/status",
  operationId: "getRegistrationStatus",
  tags: ["Registrations"],
  responses: {
    200: {
      description:
        "Whether a campaign is currently accepting public registrations.",
      content: {
        "application/json": { schema: publicRegistrationStatusSchema },
      },
    },
  },
});

/**
 * Step one of the public form: claim a university address, a personal
 * address, or both — never neither — and receive a link per address.
 *
 * Deliberately non-revealing, exactly like `resend-verification` below. The
 * response is the same "ok" whether links were sent or a send was suppressed
 * by a limiter, so this endpoint cannot answer whether either person exists.
 */
export const startRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/registrations/start",
  operationId: "startRegistration",
  tags: ["Registrations"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: registrationStartBodySchema },
      },
    },
  },
  responses: {
    200: {
      description:
        "Always returned when the address is well-formed and a campaign is " +
        "open, whether or not an email was actually sent.",
      content: {
        "application/json": { schema: registrationStartResponseSchema },
      },
    },
    409: {
      description: "No campaign is currently open for registration.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    422: {
      description: "The address is not a valid email.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    429: {
      description: "Too many link requests from either address or client.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

/**
 * Verify one address and return a resumable draft session. Personal data is
 * withheld until every supplied address's independently delivered link has
 * been opened.
 */
export const verifyRegistrationDraftLinkRoute = createRoute({
  method: "post",
  path: "/v1/registrations/verify-link",
  operationId: "verifyRegistrationDraftLink",
  tags: ["Registrations"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: registrationDraftTokenBodySchema },
      },
    },
  },
  responses: {
    200: {
      description:
        "The link was valid. Returns a draft session and every supplied address's verification state.",
      content: {
        "application/json": { schema: registrationSessionSchema },
      },
    },
    400: {
      description: "The link is invalid, expired, or already used.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "The two addresses already belong to different accounts.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    429: {
      description: "Too many attempts from this client.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const resumeRegistrationDraftRoute = createRoute({
  method: "post",
  path: "/v1/registrations/resume",
  operationId: "resumeRegistrationDraft",
  tags: ["Registrations"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: registrationDraftTokenBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Current verification state for a live draft session.",
      content: { "application/json": { schema: registrationSessionSchema } },
    },
    400: {
      description: "The draft session is invalid or expired.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "The two addresses already belong to different accounts.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const resendRegistrationDraftLinkRoute = createRoute({
  method: "post",
  path: "/v1/registrations/resend-link",
  operationId: "resendRegistrationDraftLink",
  tags: ["Registrations"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: registrationDraftResendBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Always returned for a well-formed request.",
      content: {
        "application/json": { schema: registrationStartResponseSchema },
      },
    },
  },
});

export const createRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/registrations",
  operationId: "createRegistration",
  tags: ["Registrations"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: registrationRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description:
        "The registration was saved. Because `emailToken` already proves " +
        "the address, it lands in `pending_review` — there is no " +
        "verification email and nothing further for the applicant to do " +
        "but wait for the committee.",
      content: {
        "application/json": { schema: registrationCreatedSchema },
      },
    },
    400: {
      description:
        "The `emailToken` is invalid, expired, or already spent. The " +
        "applicant has to redo the code step.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    422: {
      description: "The request did not match the registration schema.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    415: {
      description: "The request body is not JSON.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    413: {
      description: "The request body is too large.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    409: {
      description:
        "Either no campaign is currently open for registration " +
        "(error code CONFLICT), or this email already has a " +
        "registration for the open campaign (error code ALREADY_REGISTERED) " +
        "— check the response body's error.code to tell them apart.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    500: {
      description: "The registration could not be saved.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
  },
});

/**
 * Public, but deliberately non-revealing: whether `id` doesn't exist,
 * belongs to a registration that isn't `pending_email` any more, or is
 * being cooled down / rate-limited, the response is the identical generic
 * "ok" shape every time (see services/registration-service.ts's
 * `resendVerification` and contracts.ts's `resendVerificationResponseSchema`
 * doc comments) — so this endpoint can never be used to enumerate
 * registrations or probe their status.
 */
export const resendVerificationRoute = createRoute({
  method: "post",
  path: "/v1/registrations/{id}/resend-verification",
  operationId: "resendRegistrationVerification",
  tags: ["Registrations"],
  request: {
    params: registrationIdParamSchema,
  },
  responses: {
    200: {
      description:
        "Always returned, whether or not a new verification email was " +
        "actually sent — see the route's doc comment.",
      content: {
        "application/json": { schema: resendVerificationResponseSchema },
      },
    },
  },
});

const verifiedResponses = {
  200: {
    description:
      "The email is verified; the registration moved from pending_email " +
      "to pending_review. This does NOT create a membership.",
    content: {
      "application/json": { schema: verifiedSchema },
    },
  },
  400: {
    description:
      "The token is invalid, expired, or already used. Deliberately " +
      "generic — never distinguishes those cases from each other or from " +
      "a nonexistent registration.",
    content: {
      "application/json": { schema: apiErrorSchema },
    },
  },
} as const;

export const verifyRegistrationGetRoute = createRoute({
  method: "get",
  path: "/v1/registrations/verify",
  operationId: "verifyRegistrationEmailGet",
  tags: ["Registrations"],
  description:
    "What an email link naturally is: GET with the token as a query param.",
  request: {
    query: verifyTokenQuerySchema,
  },
  responses: verifiedResponses,
});

export const verifyRegistrationPostRoute = createRoute({
  method: "post",
  path: "/v1/registrations/verify",
  operationId: "verifyRegistrationEmailPost",
  tags: ["Registrations"],
  description:
    "What a client-side confirmation page might prefer: POST with the " +
    "token in the body, so it doesn't sit in server logs / browser history.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: verifyTokenBodySchema },
      },
    },
  },
  responses: verifiedResponses,
});

// ---------------------------------------------------------------------------
// Admin routes.
//
// AUTHORIZED (IA-31). `app.ts` mounts `requireCapability("registrations.review")`
// on each of these paths: the session is resolved from the forwarded cookie,
// a missing session is 401, a role without the capability (or a user with no
// `member_profile` row) is 403. The reviewer is the session user — there is
// no `reviewerId` in any request body.
// ---------------------------------------------------------------------------

const adminAuthResponses = {
  401: {
    description: "No session cookie, or the session is expired or revoked.",
    content: {
      "application/json": { schema: apiErrorSchema },
    },
  },
  403: {
    description:
      "The session's role lacks the required capability, or the user has " +
      "not completed onboarding.",
    content: {
      "application/json": { schema: apiErrorSchema },
    },
  },
};

export const adminListRegistrationsRoute = createRoute({
  method: "get",
  path: "/v1/admin/registrations",
  operationId: "adminListRegistrations",
  tags: ["Admin"],
  description:
    "Requires the `registrations.review` capability. campaignId is " +
    "required so omitting it can never list across every campaign at once.",
  request: {
    query: adminListQuerySchema,
  },
  responses: {
    200: {
      description: "Registrations for the given campaign.",
      content: {
        "application/json": { schema: adminRegistrationListSchema },
      },
    },
    422: {
      description: "campaignId is missing or status is not a valid value.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    ...adminAuthResponses,
  },
});

export const adminAcceptRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/admin/registrations/{id}/accept",
  operationId: "adminAcceptRegistration",
  tags: ["Admin"],
  description:
    "Requires the `registrations.review` capability. The reviewer is the " +
    "session user.",
  request: {
    params: registrationIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: adminAcceptBodySchema },
      },
    },
  },
  responses: {
    200: {
      description:
        "Accepted: the membership was created. notificationSent is false " +
        "if the acceptance email failed to send — the membership still " +
        "stands either way.",
      content: {
        "application/json": { schema: adminAcceptResponseSchema },
      },
    },
    404: {
      description: "No registration with that id.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    409: {
      description: "The registration is not in pending_review.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    ...adminAuthResponses,
  },
});

export const adminRejectRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/admin/registrations/{id}/reject",
  operationId: "adminRejectRegistration",
  tags: ["Admin"],
  description:
    "Requires the `registrations.review` capability. The reviewer is the " +
    "session user.",
  request: {
    params: registrationIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: adminRejectBodySchema },
      },
    },
  },
  responses: {
    200: {
      description:
        "Rejected. notificationSent is false if the rejection email " +
        "failed to send — the rejection still stands either way.",
      content: {
        "application/json": { schema: adminRejectResponseSchema },
      },
    },
    404: {
      description: "No registration with that id.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    409: {
      description: "The registration is not in pending_review.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    ...adminAuthResponses,
  },
});

// --- Admin: overview ---------------------------------------------------

export const adminOverviewRoute = createRoute({
  method: "get",
  path: "/v1/admin/overview",
  operationId: "adminOverview",
  tags: ["Admin"],
  description:
    "Dashboard counts for the current campaign plus the current / " +
    "registration-open campaign refs for the header. Requires the " +
    "`dashboard.read` capability.",
  responses: {
    200: {
      description: "Counts and campaign context.",
      content: {
        "application/json": { schema: adminOverviewSchema },
      },
    },
    ...adminAuthResponses,
  },
});

export const adminPushPublicKeyRoute = createRoute({
  method: "get",
  path: "/v1/admin/push/public-key",
  operationId: "adminPushPublicKey",
  tags: ["Admin"],
  description:
    "The VAPID public key the admin PWA needs to create a push " +
    "subscription. Fetched at runtime so no key is compiled into the " +
    "browser bundle. Empty string when push is not configured on the " +
    "server. Requires the `notifications.manage` capability.",
  responses: {
    200: {
      description: "The VAPID public key, or an empty string.",
      content: { "application/json": { schema: pushPublicKeySchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminPushSubscribeRoute = createRoute({
  method: "post",
  path: "/v1/admin/push/subscribe",
  operationId: "adminPushSubscribe",
  tags: ["Admin"],
  description:
    "Register (or refresh) this browser's push subscription for the " +
    "signed-in admin. Idempotent on the endpoint. Requires `notifications.manage`.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: pushSubscribeBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "The subscription is stored.",
      content: {
        "application/json": { schema: pushSubscribeResponseSchema },
      },
    },
    ...adminAuthResponses,
  },
});

export const adminPushUnsubscribeRoute = createRoute({
  method: "post",
  path: "/v1/admin/push/unsubscribe",
  operationId: "adminPushUnsubscribe",
  tags: ["Admin"],
  description:
    "Drop this browser's push subscription. Idempotent. Requires " +
    "`notifications.manage`.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: pushUnsubscribeBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "The subscription is gone.",
      content: {
        "application/json": { schema: pushUnsubscribeResponseSchema },
      },
    },
    ...adminAuthResponses,
  },
});

// --- Admin: campaigns ------------------------------------------------------

export const adminListCampaignsRoute = createRoute({
  method: "get",
  path: "/v1/admin/campaigns",
  operationId: "adminListCampaigns",
  tags: ["Admin"],
  description:
    "Campaigns with active-member and pending-review counts, newest " +
    "membership start first. Paginated for a uniform table contract even " +
    "though the set is small. Requires `campaigns.write`.",
  request: { query: adminCampaignListQuerySchema },
  responses: {
    200: {
      description: "All campaigns, newest membership start first.",
      content: { "application/json": { schema: adminCampaignListSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminCreateCampaignRoute = createRoute({
  method: "post",
  path: "/v1/admin/campaigns",
  operationId: "adminCreateCampaign",
  tags: ["Admin"],
  description:
    "Create a draft campaign (all four dates required). Requires `campaigns.write`.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: adminCreateCampaignBodySchema },
      },
    },
  },
  responses: {
    201: {
      description: "The draft campaign.",
      content: { "application/json": { schema: adminCampaignSchema } },
    },
    409: {
      description: "The slug is already taken, or the date ranges are invalid.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminUpdateCampaignRoute = createRoute({
  method: "patch",
  path: "/v1/admin/campaigns/{id}",
  operationId: "adminUpdateCampaign",
  tags: ["Admin"],
  description:
    "Edit a campaign. The slug can only change while it is a draft. Requires `campaigns.write`.",
  request: {
    params: campaignIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: adminUpdateCampaignBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "The campaign.",
      content: { "application/json": { schema: adminCampaignSchema } },
    },
    404: {
      description: "No campaign with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "Illegal edit (e.g. renaming a published campaign's slug).",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminSetCampaignRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/admin/campaigns/{id}/registration",
  operationId: "adminSetCampaignRegistration",
  tags: ["Admin"],
  description:
    "Open or close public registration for this campaign. Opening it " +
    "closes whichever other campaign was open, in one transaction. " +
    "Requires `campaigns.rollover`.",
  request: {
    params: campaignIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: adminCampaignRegistrationBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "The campaign.",
      content: { "application/json": { schema: adminCampaignSchema } },
    },
    404: {
      description: "No campaign with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminSetCampaignCurrentRoute = createRoute({
  method: "post",
  path: "/v1/admin/campaigns/{id}/current",
  operationId: "adminSetCampaignCurrent",
  tags: ["Admin"],
  description:
    "Make this the current campaign, clearing the flag from whichever " +
    "campaign held it, in one transaction. Requires `campaigns.rollover`.",
  request: { params: campaignIdParamSchema },
  responses: {
    200: {
      description: "The campaign.",
      content: { "application/json": { schema: adminCampaignSchema } },
    },
    404: {
      description: "No campaign with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminArchiveCampaignRoute = createRoute({
  method: "post",
  path: "/v1/admin/campaigns/{id}/archive",
  operationId: "adminArchiveCampaign",
  tags: ["Admin"],
  description:
    "Archive a campaign. Never deletes; clears both coexistence flags. " +
    "Requires `campaigns.rollover`.",
  request: { params: campaignIdParamSchema },
  responses: {
    200: {
      description: "The campaign.",
      content: { "application/json": { schema: adminCampaignSchema } },
    },
    404: {
      description: "No campaign with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

// --- Admin: registration detail + restore --------------------------------

export const adminGetRegistrationRoute = createRoute({
  method: "get",
  path: "/v1/admin/registrations/{id}",
  operationId: "adminGetRegistration",
  tags: ["Admin"],
  description:
    "One registration with its profile snapshot, the applicant's prior " +
    "memberships, a new/returning classification and any duplicate " +
    "registrations for the same email. Requires `registrations.review`.",
  request: { params: registrationIdParamSchema },
  responses: {
    200: {
      description: "The registration and its review context.",
      content: {
        "application/json": { schema: adminRegistrationDetailSchema },
      },
    },
    404: {
      description: "No registration with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminRestoreRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/admin/registrations/{id}/restore",
  operationId: "adminRestoreRegistration",
  tags: ["Admin"],
  description:
    "Move a rejected registration back to pending_review. Never goes " +
    "straight to accepted. Requires `registrations.review`.",
  request: { params: registrationIdParamSchema },
  responses: {
    200: {
      description: "The registration is back in the review queue.",
      content: {
        "application/json": { schema: adminRestoreResponseSchema },
      },
    },
    404: {
      description: "No registration with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "The registration is not in the rejected state.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

// --- Admin: members ---------------------------------------------------

export const adminListMembersRoute = createRoute({
  method: "get",
  path: "/v1/admin/members",
  operationId: "adminListMembers",
  tags: ["Admin"],
  description:
    "Paginated, searchable member list. `q` matches name / surnames / " +
    "email; `filter` is all | current | past. Requires `members.read`.",
  request: { query: adminMemberListQuerySchema },
  responses: {
    200: {
      description: "A page of members plus the total match count.",
      content: { "application/json": { schema: adminMemberListSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminGetMemberRoute = createRoute({
  method: "get",
  path: "/v1/admin/members/{userId}",
  operationId: "adminGetMember",
  tags: ["Admin"],
  description:
    "One member: profile, every membership row with its campaign, and the " +
    "full audit timeline. Requires `members.read`.",
  request: { params: userIdParamSchema },
  responses: {
    200: {
      description: "The member's profile and history.",
      content: { "application/json": { schema: adminMemberDetailSchema } },
    },
    404: {
      description: "No member (member_profile row) with that user id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminMemberLeaveRoute = createRoute({
  method: "post",
  path: "/v1/admin/members/{userId}/leave",
  operationId: "adminMemberLeave",
  tags: ["Admin"],
  description:
    "End this member's current-campaign membership as `left`. Requires " +
    "`members.status.write`.",
  request: {
    params: userIdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: adminLeaveBodySchema } },
    },
  },
  responses: {
    200: {
      description: "The action was applied to the current-campaign membership.",
      content: {
        "application/json": { schema: adminMemberStatusResponseSchema },
      },
    },
    404: {
      description:
        "No member with that id, or no membership for them in the " +
        "current campaign.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description:
        "The membership is not in a state that allows this transition, " +
        "or no campaign is current.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminMemberKickRoute = createRoute({
  method: "post",
  path: "/v1/admin/members/{userId}/kick",
  operationId: "adminMemberKick",
  tags: ["Admin"],
  description:
    "End this member's current-campaign membership as `kicked` (reason " +
    "required) and revoke all their sessions. Requires " +
    "`members.status.write`.",
  request: {
    params: userIdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: adminKickBodySchema } },
    },
  },
  responses: {
    200: {
      description: "The action was applied to the current-campaign membership.",
      content: {
        "application/json": { schema: adminMemberStatusResponseSchema },
      },
    },
    404: {
      description:
        "No member with that id, or no membership for them in the " +
        "current campaign.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description:
        "The membership is not in a state that allows this transition, " +
        "or no campaign is current.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminMemberRestoreRoute = createRoute({
  method: "post",
  path: "/v1/admin/members/{userId}/restore",
  operationId: "adminMemberRestore",
  tags: ["Admin"],
  description:
    "Reactivate a `left` or `kicked` current-campaign membership. " +
    "Requires `members.status.write`.",
  request: { params: userIdParamSchema },
  responses: {
    200: {
      description: "The action was applied to the current-campaign membership.",
      content: {
        "application/json": { schema: adminMemberStatusResponseSchema },
      },
    },
    404: {
      description:
        "No member with that id, or no membership for them in the " +
        "current campaign.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description:
        "The membership is not in a state that allows this transition, " +
        "or no campaign is current.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminMemberSetRoleRoute = createRoute({
  method: "patch",
  path: "/v1/admin/members/{userId}/role",
  operationId: "adminMemberSetRole",
  tags: ["Admin"],
  description:
    "Promote or demote a member between `member` and `admin`. Writes a " +
    "`role_changed` audit event, separate from membership changes. " +
    "Requires `members.role.write`.",
  request: {
    params: userIdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: adminSetRoleBodySchema } },
    },
  },
  responses: {
    200: {
      description: "The member's new role.",
      content: {
        "application/json": { schema: adminSetRoleResponseSchema },
      },
    },
    404: {
      description: "No member (member_profile row) with that user id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminSetMemberEmailsRoute = createRoute({
  method: "patch",
  path: "/v1/admin/members/{userId}/emails",
  operationId: "adminSetMemberEmails",
  tags: ["Admin"],
  description:
    "Set, replace or clear a member's university / personal email " +
    "addresses. A field with a string sets that slot (stored already " +
    "verified — an admin edit is trusted, so the member can sign in with " +
    "it at once); a field set to `null` clears it; an omitted field is " +
    "left as-is. The edit may not leave the member with no address, and " +
    "the canonical account email is re-pointed at the personal address " +
    "(or the university one if there is no personal). Any well-formed " +
    "address is allowed in either slot, but the two slots must differ. " +
    "Requires `members.email.write`.",
  request: {
    params: userIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: adminSetMemberEmailsBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "The member's addresses after the edit.",
      content: {
        "application/json": { schema: adminMemberEmailsResponseSchema },
      },
    },
    404: {
      description: "No member (member_profile row) with that user id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    422: {
      description:
        "Neither email field was supplied, an address is malformed, or both " +
        "slots contain the same address.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description:
        "One of the addresses is already linked to another account, or " +
        "the edit would leave the member with no email address at all.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminDeleteMemberRoute = createRoute({
  method: "delete",
  path: "/v1/admin/members/{userId}",
  operationId: "adminDeleteMember",
  tags: ["Admin"],
  description:
    "Permanently and irreversibly erase this user and every row that " +
    "refers to them: their account and sessions, member profile, all " +
    "membership rows, the membership-event entries where they are the " +
    "target, invitations they sent, and every registration / " +
    "email-challenge / magic-link token for their address. This is NOT " +
    'the reversible leave / kick ("donar de baixa") flow, which keeps ' +
    "all of that history. Requires `members.delete`, the most privileged " +
    "grant, held by `admin` only.",
  request: { params: userIdParamSchema },
  responses: {
    200: {
      description:
        "The user and all their data were erased. The body reports the " +
        "row count removed from each table.",
      content: {
        "application/json": { schema: adminDeleteMemberResponseSchema },
      },
    },
    404: {
      description: "No user with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

// --- Admin: invitations -----------------------------------------------

export const adminListInvitationsRoute = createRoute({
  method: "get",
  path: "/v1/admin/invitations",
  operationId: "adminListInvitations",
  tags: ["Admin"],
  description:
    "Invitations for a campaign, `expired` computed at read time. " +
    "Requires `invitations.write`.",
  request: { query: adminInvitationListQuerySchema },
  responses: {
    200: {
      description: "Invitations for the campaign, newest first.",
      content: {
        "application/json": { schema: adminInvitationListSchema },
      },
    },
    ...adminAuthResponses,
  },
});

export const adminCreateInvitationRoute = createRoute({
  method: "post",
  path: "/v1/admin/invitations",
  operationId: "adminCreateInvitation",
  tags: ["Admin"],
  description:
    "Invite someone to a campaign. Requires `invitations.write`, and " +
    "`invitations.grant_admin` as well when intendedRole is admin. A " +
    "non-udl.cat email needs allowExternalDomain: true.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: adminCreateInvitationBodySchema },
      },
    },
  },
  responses: {
    201: {
      description: "The pending invitation.",
      content: { "application/json": { schema: adminInvitationSchema } },
    },
    409: {
      description:
        "An invitation for this email + campaign already exists, or the " +
        "email domain needs confirmation, or admin was requested without " +
        "the capability.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminResendInvitationRoute = createRoute({
  method: "post",
  path: "/v1/admin/invitations/{id}/resend",
  operationId: "adminResendInvitation",
  tags: ["Admin"],
  description:
    "Rotate the token on a pending invitation and email it again. " +
    "Requires `invitations.write`.",
  request: { params: invitationIdParamSchema },
  responses: {
    200: {
      description: "A fresh link was sent.",
      content: {
        "application/json": { schema: adminInvitationActionResponseSchema },
      },
    },
    404: {
      description: "No invitation with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "The invitation is not pending.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

export const adminCancelInvitationRoute = createRoute({
  method: "post",
  path: "/v1/admin/invitations/{id}/cancel",
  operationId: "adminCancelInvitation",
  tags: ["Admin"],
  description:
    "Cancel a pending invitation and notify the invitee. Requires " +
    "`invitations.write`.",
  request: { params: invitationIdParamSchema },
  responses: {
    200: {
      description: "The invitation was cancelled.",
      content: {
        "application/json": { schema: adminInvitationActionResponseSchema },
      },
    },
    404: {
      description: "No invitation with that id.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "The invitation is not pending.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    ...adminAuthResponses,
  },
});

// --- Public: invitation onboarding ----------------------------------

export const invitationLookupRoute = createRoute({
  method: "post",
  path: "/v1/invitations/lookup",
  operationId: "lookupInvitation",
  tags: ["Invitations"],
  description:
    "Resolve an invitation token (in the body, never the query string) " +
    "to the bound email, prefilled name, and campaign label. A generic " +
    "400 for any invalid / expired / used / unknown token.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: invitationLookupBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "The invitation is valid and pending.",
      content: {
        "application/json": { schema: invitationLookupResponseSchema },
      },
    },
    400: {
      description: "The token is invalid, expired, cancelled, or used.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    429: {
      description: "Too many lookups from this address.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

export const invitationAcceptRoute = createRoute({
  method: "post",
  path: "/v1/invitations/accept",
  operationId: "acceptInvitation",
  tags: ["Invitations"],
  description:
    "Complete onboarding from an invitation. The email and campaign come " +
    "from the token, never the body. Creates the account, profile, " +
    "membership and the annual registration snapshot, then emails the " +
    "welcome message.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: invitationAcceptBodySchema },
      },
    },
  },
  responses: {
    200: {
      description:
        "Onboarding is complete. `alreadyMember` is true if the person " +
        "was already a member (idempotent).",
      content: {
        "application/json": { schema: invitationAcceptResponseSchema },
      },
    },
    400: {
      description: "The token is invalid, expired, cancelled, or used.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    429: {
      description: "Too many attempts from this address.",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

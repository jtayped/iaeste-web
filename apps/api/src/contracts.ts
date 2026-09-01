import { z } from "@hono/zod-openapi";

import { DEGREE_OPTIONS } from "@repo/constants/studies";
import { isUniversityEmail } from "@repo/constants/validators/member-email";
import { isValidPhone } from "@repo/constants/validators/phone";

import { API_VERSION } from "./version";

/**
 * The profile half of a registration, shared by the public form and the
 * invitation onboarding form — they now ask for exactly the same things.
 * The address is never in here: it comes from an email-challenge session on
 * one path and from an invitation token on the other.
 */
const registrationProfileShape = {
  name: z.string().trim().min(2).max(120).openapi({ example: "Joan" }),
  surnames: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .openapi({ example: "Garcia Serra" }),
  phone: z
    .string()
    .trim()
    .min(1)
    .refine(isValidPhone, "el número de telèfon no és vàlid")
    .openapi({ example: "+34 623 32 42 34" }),
  degree: z
    .enum(DEGREE_OPTIONS)
    .openapi({ example: "grau en informàtica (lleida)" }),
  year: z.number().int().min(1).max(6).openapi({ example: 2 }),
  note: z.string().trim().max(2_000).optional().openapi({
    example: "M'interessen els intercanvis internacionals.",
  }),
};

export const registrationRequestSchema = z
  .object({
    ...registrationProfileShape,
    /**
     * The session handed back by a registration verification link. This
     * is where the address comes from — a body cannot claim one, so a
     * registration can only ever be filed against an inbox the submitter
     * actually opened.
     */
    emailToken: z.string().min(1).openapi({ example: "a1b2c3..." }),
  })
  .openapi("RegistrationRequest");

export const registrationCreatedSchema = z
  .object({
    status: z.literal("created"),
    id: z.string().openapi({ example: "registration_123" }),
    outcome: z.enum(["pending_review", "accepted"]).openapi({
      description:
        "Returning members from the immediately preceding campaign are accepted automatically; everyone else waits for review.",
    }),
  })
  .openapi("RegistrationCreated");

const REGISTRATION_STATUS_VALUES = [
  "pending_email",
  "pending_review",
  "accepted",
  "rejected",
] as const;

export const registrationStatusSchema = z
  .enum(REGISTRATION_STATUS_VALUES)
  .openapi("RegistrationStatus");

// --- Registration: proving the address before anything is collected -------

/** An empty or missing field means "not supplied", not an invalid address. */
function optionalRegistrationEmail(
  refine: [(email: string) => boolean, string],
) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .refine(...refine)
      .optional(),
  );
}

/**
 * A university address, a personal one, or both — never neither. See
 * `@repo/constants`'s `memberEmailsSchema`, which this contract-layer copy
 * deliberately mirrors (English messages, `.openapi()` metadata) rather than
 * importing directly.
 */
export const registrationStartBodySchema = z
  .object({
    universityEmail: optionalRegistrationEmail([
      isUniversityEmail,
      "must be a udl.cat or alumnes.udl.cat address",
    ]).openapi({ example: "joan@alumnes.udl.cat" }),
    personalEmail: optionalRegistrationEmail([
      (email) => !isUniversityEmail(email),
      "must be a personal address",
    ]).openapi({ example: "joan@example.com" }),
  })
  .refine(
    ({ universityEmail, personalEmail }) =>
      Boolean(universityEmail || personalEmail),
    { path: ["personalEmail"], message: "at least one address is required" },
  )
  .refine(
    ({ universityEmail, personalEmail }) =>
      !universityEmail || !personalEmail || universityEmail !== personalEmail,
    { path: ["personalEmail"], message: "the two addresses must differ" },
  )
  .openapi("RegistrationStartRequest");

/**
 * Identical whether a code was sent, the address already has a live code, or
 * registration happens to be closed to this person — the first step of a
 * public form must not answer "does this address exist" to anyone who asks.
 */
export const registrationStartResponseSchema = z
  .object({
    status: z.literal("ok"),
    /** Seconds the client should wait before offering "send it again". */
    resendAfterSeconds: z.number().int(),
  })
  .openapi("RegistrationStartResponse");

export const registrationDraftTokenBodySchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/i) })
  .openapi("RegistrationDraftTokenRequest");

export const registrationDraftResendBodySchema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/i),
    kind: z.enum(["university", "personal"]),
  })
  .openapi("RegistrationDraftResendRequest");

/** What the form can prefill, in the shape the form's own fields use. */
export const knownProfileSchema = z
  .object({
    name: z.string(),
    surnames: z.string(),
    phone: z.string(),
    degree: z.string(),
    year: z.number().int(),
  })
  .openapi("KnownProfile");

/** One "you were with us in…" line: the campaign and how it ended. */
export const knownMembershipSchema = z
  .object({
    campaignLabel: z.string().openapi({ example: "2025-2026" }),
    status: z.enum(["active", "left", "kicked"]),
  })
  .openapi("KnownMembership");

/**
 * The reward for proving the address: a session token for the rest of the
 * flow, plus everything already on file about this person. Only ever reached
 * through a correct six-digit code.
 */
export const registrationSessionSchema = z
  .object({
    token: z.string(),
    expiresAt: z.string(),
    ready: z.boolean(),
    // Only the kind(s) actually supplied at `start` appear here — a draft
    // started with just a university address never gets a `personal` key.
    emails: z.object({
      university: z
        .object({
          maskedAddress: z.string(),
          verified: z.boolean(),
        })
        .optional(),
      personal: z
        .object({
          maskedAddress: z.string(),
          verified: z.boolean(),
        })
        .optional(),
    }),
    known: z.boolean(),
    profile: knownProfileSchema.nullable(),
    memberships: z.array(knownMembershipSchema),
    /**
     * Their registration status in the campaign now open, if they already
     * have one — so the form can say "you have already applied" instead of
     * letting them fill everything in and fail on submit.
     *
     * A fresh `z.enum` rather than `registrationStatusSchema.nullable()`:
     * `.nullable()` on a registered component mutates the component itself,
     * which would make `RegistrationStatus` nullable for every other reader
     * of it (the admin table included).
     */
    openCampaignRegistrationStatus: z
      .enum(REGISTRATION_STATUS_VALUES)
      .nullable(),
    /** True when this proven identity can renew without committee review. */
    willAutoAccept: z.boolean(),
  })
  .openapi("RegistrationSession");

export const publicRegistrationStatusSchema = z
  .object({
    open: z.boolean(),
    /**
     * The registration window of whichever campaign this status is about: the
     * open one when `open` is true, otherwise the soonest upcoming one. Both
     * are null when there is neither, which is the only case the public site
     * has nothing to say. ISO-8601, UTC.
     */
    opensAt: z
      .string()
      .nullable()
      .openapi({ example: "2026-09-15T08:00:00.000Z" }),
    closesAt: z
      .string()
      .nullable()
      .openapi({ example: "2026-10-15T22:00:00.000Z" }),
  })
  .openapi("PublicRegistrationStatus");

export type PublicRegistrationStatus = z.infer<
  typeof publicRegistrationStatusSchema
>;

export const validationIssueSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  })
  .openapi("ValidationIssue");

export const apiErrorSchema = z
  .object({
    error: z.object({
      code: z.enum([
        "VALIDATION_ERROR",
        "UNSUPPORTED_MEDIA_TYPE",
        "PAYLOAD_TOO_LARGE",
        "UNAUTHENTICATED",
        "FORBIDDEN",
        "NOT_FOUND",
        "CONFLICT",
        "ALREADY_REGISTERED",
        "INVALID_TOKEN",
        "INTERNAL_ERROR",
      ]),
      message: z.string(),
      details: z.array(validationIssueSchema).optional(),
    }),
    requestId: z.string(),
  })
  .openapi("ApiError");

export const healthSchema = z
  .object({
    status: z.literal("ok"),
    version: z.literal(API_VERSION),
  })
  .openapi("Health");

// --- Verification -----------------------------------------------------------

/**
 * Deliberately non-committal wording: this response shape is identical
 * whether `POST /v1/registrations/:id/resend-verification` actually sent
 * anything or not (unknown id, wrong status, cooldown/rate limit all no-op
 * silently) — see routes.ts's doc comment on that route.
 */
export const resendVerificationResponseSchema = z
  .object({
    status: z.literal("ok"),
    message: z.string(),
  })
  .openapi("ResendVerificationResponse");

export const verifyTokenBodySchema = z
  .object({
    token: z.string().min(1).openapi({ example: "a1b2c3..." }),
  })
  .openapi("VerifyTokenRequest");

export const verifyTokenQuerySchema = z.object({
  token: z.string().min(1).openapi({ example: "a1b2c3..." }),
});

export const verifiedSchema = z
  .object({
    status: z.literal("verified"),
  })
  .openapi("Verified");

// --- Admin --------------------------------------------------------------

export const adminRegistrationProfileSnapshotSchema = z
  .object({
    name: z.string(),
    surnames: z.string(),
    phoneE164: z.string(),
    phoneDisplay: z.string(),
    degree: z.string(),
    studyYear: z.number(),
    note: z.string().optional(),
  })
  .openapi("AdminRegistrationProfileSnapshot");

export const adminRegistrationSchema = z
  .object({
    id: z.string(),
    campaignId: z.string(),
    email: z.string(),
    universityEmail: z.string().nullable(),
    personalEmail: z.string().nullable(),
    status: registrationStatusSchema,
    profileSnapshot: adminRegistrationProfileSnapshotSchema,
    source: z.string(),
    verifiedAt: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    reviewerId: z.string().nullable(),
    rejectionReason: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminRegistration");

export const adminRegistrationListSchema = z
  .object({
    rows: z.array(adminRegistrationSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("AdminRegistrationList");

export const adminListQuerySchema = z.object({
  campaignId: z.string().min(1).openapi({ example: "campaign_123" }),
  status: registrationStatusSchema.optional(),
  /** ILIKE over email, snapshot name, and snapshot surnames. */
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const registrationIdParamSchema = z.object({
  id: z.string().min(1).openapi({ example: "registration_123" }),
});

// IA-31: the reviewer is the authenticated session user, resolved by the
// `requireCapability` middleware — never a self-reported id in the body.
export const adminAcceptBodySchema = z
  .object({
    membershipSource: z.string().min(1).optional().openapi({
      example: "registration",
    }),
  })
  .openapi("AdminAcceptRequest");

export const adminRejectBodySchema = z
  .object({
    reason: z.string().min(1).max(2_000).openapi({
      example: "No hi ha places disponibles aquest curs.",
    }),
  })
  .openapi("AdminRejectRequest");

/**
 * `notificationSent: false` means the admin action itself succeeded (the
 * registration is accepted/rejected in the database) but the follow-up
 * email failed to send — a distinct, retryable-later condition from full
 * success. See services/registration-service.ts's `accept`/`reject`.
 */
export const adminAcceptResponseSchema = z
  .object({
    status: z.literal("accepted"),
    notificationSent: z.boolean(),
  })
  .openapi("AdminAcceptResponse");

export const adminRejectResponseSchema = z
  .object({
    status: z.literal("rejected"),
    notificationSent: z.boolean(),
  })
  .openapi("AdminRejectResponse");

// --- Admin: overview ---------------------------------------------------

export const adminCampaignRefSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    label: z.string(),
  })
  .openapi("AdminCampaignRef");

export const adminOverviewSchema = z
  .object({
    /** The `is_current` campaign, or null if none is current. */
    currentCampaign: adminCampaignRefSchema.nullable(),
    /** The `is_registration_open` campaign — may differ from the current one. */
    registrationOpenCampaign: adminCampaignRefSchema.nullable(),
    counts: z.object({
      pendingVerification: z.number().int(),
      pendingReview: z.number().int(),
      activeMembers: z.number().int(),
      newMembers: z.number().int(),
      returningMembers: z.number().int(),
      unrenewedPastMembers: z.number().int(),
    }),
  })
  .openapi("AdminOverview");

// --- Admin: campaigns ------------------------------------------------------

export const campaignStateSchema = z
  .enum(["draft", "published", "archived"])
  .openapi("CampaignState");

const campaignBaseShape = {
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  membershipStartsAt: z.string(),
  membershipEndsAt: z.string(),
  registrationOpensAt: z.string(),
  registrationClosesAt: z.string(),
  isCurrent: z.boolean(),
  isRegistrationOpen: z.boolean(),
  state: campaignStateSchema,
  sheetTabName: z.string().nullable(),
  sheetSyncedAt: z.string().nullable(),
  sheetStale: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const adminCampaignSchema = z
  .object(campaignBaseShape)
  .openapi("AdminCampaign");

export const adminCampaignWithCountsSchema = z
  .object({
    ...campaignBaseShape,
    activeMembers: z.number().int(),
    pendingReview: z.number().int(),
  })
  .openapi("AdminCampaignWithCounts");

export const adminCampaignListSchema = z
  .object({
    rows: z.array(adminCampaignWithCountsSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("AdminCampaignList");
export const adminCampaignListQuerySchema = z.object({
  /** ILIKE over slug and label. */
  q: z.string().trim().max(200).optional(),
  state: campaignStateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const campaignIdParamSchema = z.object({
  id: z.string().min(1).openapi({ example: "campaign_123" }),
});

const isoDate = z.string().datetime({ offset: true });

export const adminCreateCampaignBodySchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(
        /^[a-z0-9-]+$/,
        "slug must be lowercase letters, digits and dashes",
      ),
    label: z.string().trim().min(1).max(120),
    membershipStartsAt: isoDate,
    membershipEndsAt: isoDate,
    registrationOpensAt: isoDate,
    registrationClosesAt: isoDate,
  })
  .openapi("AdminCreateCampaignRequest");

export const adminUpdateCampaignBodySchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    label: z.string().trim().min(1).max(120).optional(),
    membershipStartsAt: isoDate.optional(),
    membershipEndsAt: isoDate.optional(),
    registrationOpensAt: isoDate.optional(),
    registrationClosesAt: isoDate.optional(),
  })
  .openapi("AdminUpdateCampaignRequest");

export const adminCampaignRegistrationBodySchema = z
  .object({
    open: z.boolean(),
  })
  .openapi("AdminCampaignRegistrationRequest");

// --- Admin: registration detail + restore --------------------------------

export const adminPriorMembershipSchema = z
  .object({
    campaignId: z.string(),
    campaignSlug: z.string(),
    campaignLabel: z.string(),
    status: z.string(),
    joinedAt: z.string(),
    endedAt: z.string().nullable(),
  })
  .openapi("AdminPriorMembership");

export const adminDuplicateRegistrationSchema = z
  .object({
    id: z.string(),
    campaignId: z.string(),
    campaignLabel: z.string(),
    status: registrationStatusSchema,
    createdAt: z.string(),
  })
  .openapi("AdminDuplicateRegistration");

export const adminRegistrationDetailSchema = z
  .object({
    registration: adminRegistrationSchema,
    existingUserId: z.string().nullable(),
    priorMemberships: z.array(adminPriorMembershipSchema),
    classification: z.enum(["new", "returning"]),
    duplicateRegistrations: z.array(adminDuplicateRegistrationSchema),
  })
  .openapi("AdminRegistrationDetail");

export const adminRestoreResponseSchema = z
  .object({ status: z.literal("restored") })
  .openapi("AdminRestoreResponse");

// --- Admin: members -----------------------------------------------------

export const userIdParamSchema = z.object({
  userId: z.string().min(1).openapi({ example: "user_123" }),
});

export const adminMemberListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  filter: z.enum(["all", "current", "past"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const adminMemberListItemSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    surnames: z.string(),
    email: z.string(),
    degree: z.string(),
    studyYear: z.number(),
    role: z.string().nullable(),
    currentStatus: z.string().nullable(),
    totalMemberships: z.number().int(),
  })
  .openapi("AdminMemberListItem");

export const adminMemberListSchema = z
  .object({
    rows: z.array(adminMemberListItemSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("AdminMemberList");

export const adminMemberProfileSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    surnames: z.string(),
    email: z.string(),
    phoneE164: z.string(),
    phoneDisplay: z.string(),
    degree: z.string(),
    studyYear: z.number(),
    role: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("AdminMemberProfile");

/**
 * One stored address for a member. `verifiedAt` is an ISO timestamp when the
 * member (or an admin) has confirmed the address, `null` while it is still
 * pending. `null` in place of the whole object means the slot is empty.
 */
export const adminMemberEmailSchema = z
  .object({
    email: z.string(),
    verifiedAt: z.string().nullable(),
  })
  .nullable()
  .openapi("AdminMemberEmail");

export const adminMemberEmailsSchema = z
  .object({
    university: adminMemberEmailSchema,
    personal: adminMemberEmailSchema,
  })
  .openapi("AdminMemberEmails");

/**
 * Set / replace / clear a member's addresses from the admin fitxa. A field
 * set to a string sets that slot (stored already verified — an admin edit is
 * trusted); a field set to `null` clears it; an omitted field is untouched.
 * At least one field must be present, and the edit may not leave the member
 * with no address at all (enforced server-side against the resulting state).
 * Any well-formed address is accepted in either slot — the university /
 * personal split is a label here, not a domain rule.
 */
export const adminSetMemberEmailsBodySchema = z
  .object({
    university: z
      .string()
      .trim()
      .toLowerCase()
      .email("adreça de correu electrònic no vàlida")
      .nullable(),
    personal: z
      .string()
      .trim()
      .toLowerCase()
      .email("adreça de correu electrònic no vàlida")
      .nullable(),
  })
  .partial()
  .refine(
    (body) => body.university !== undefined || body.personal !== undefined,
    { message: "indica com a mínim un dels dos correus" },
  )
  .refine(
    ({ university, personal }) =>
      !university || !personal || university !== personal,
    {
      path: ["personal"],
      message: "els dos correus han de ser diferents",
    },
  )
  .openapi("AdminSetMemberEmailsRequest");

export const adminMemberTimelineMembershipSchema = z
  .object({
    id: z.string(),
    campaignId: z.string(),
    campaignSlug: z.string(),
    campaignLabel: z.string(),
    status: z.string(),
    source: z.string(),
    joinedAt: z.string(),
    endedAt: z.string().nullable(),
    endedReason: z.string().nullable(),
  })
  .openapi("AdminMemberTimelineMembership");

export const adminMemberTimelineEventSchema = z
  .object({
    id: z.string(),
    eventType: z.string(),
    actorId: z.string().nullable(),
    campaignId: z.string().nullable(),
    details: z.unknown(),
    createdAt: z.string(),
  })
  .openapi("AdminMemberTimelineEvent");

export const adminMemberDetailSchema = z
  .object({
    profile: adminMemberProfileSchema,
    emails: adminMemberEmailsSchema,
    memberships: z.array(adminMemberTimelineMembershipSchema),
    events: z.array(adminMemberTimelineEventSchema),
  })
  .openapi("AdminMemberDetail");

/** The signed-in member's editable profile plus their login addresses. */
export const adminOwnProfileSchema = z
  .object({
    profile: adminMemberProfileSchema,
    emails: adminMemberEmailsSchema,
  })
  .openapi("AdminOwnProfile");

export const adminUpdateOwnProfileBodySchema = z
  .object({
    name: registrationProfileShape.name,
    surnames: registrationProfileShape.surnames,
    phone: registrationProfileShape.phone,
    degree: registrationProfileShape.degree,
    year: registrationProfileShape.year,
  })
  .openapi("AdminUpdateOwnProfileRequest");

export const adminLeaveBodySchema = z
  .object({ reason: z.string().trim().max(2_000).optional() })
  .openapi("AdminLeaveRequest");

export const adminKickBodySchema = z
  .object({ reason: z.string().trim().min(1).max(2_000) })
  .openapi("AdminKickRequest");

export const adminSetRoleBodySchema = z
  .object({ role: z.enum(["member", "admin"]) })
  .openapi("AdminSetRoleRequest");

export const adminMemberStatusResponseSchema = z
  .object({ status: z.enum(["left", "kicked", "restored"]) })
  .openapi("AdminMemberStatusResponse");

export const adminSetRoleResponseSchema = z
  .object({ role: z.string() })
  .openapi("AdminSetRoleResponse");

export const adminMemberEmailsResponseSchema = z
  .object({ emails: adminMemberEmailsSchema })
  .openapi("AdminMemberEmailsResponse");

export const adminDeleteMemberResponseSchema = z
  .object({
    userId: z.string(),
    email: z.string(),
    // Per-table row counts removed by the erasure, for the audit log and so
    // the admin sees exactly what was destroyed.
    deleted: z.object({
      registrations: z.number().int(),
      registrationVerifications: z.number().int(),
      emailChallenges: z.number().int(),
      authVerifications: z.number().int(),
      memberInvitations: z.number().int(),
      membershipEvents: z.number().int(),
      memberships: z.number().int(),
      pushSubscriptions: z.number().int(),
      sessions: z.number().int(),
      accounts: z.number().int(),
      memberProfile: z.number().int(),
    }),
  })
  .openapi("AdminDeleteMemberResponse");

// --- Invitations: admin + public onboarding ----------------------------

export const invitationRoleSchema = z
  .enum(["member", "admin"])
  .openapi("InvitationRole");

export const adminInvitationSchema = z
  .object({
    id: z.string(),
    campaignId: z.string(),
    email: z.string(),
    intendedRole: invitationRoleSchema,
    prefillName: z.string().nullable(),
    prefillSurnames: z.string().nullable(),
    status: z.enum(["pending", "accepted", "cancelled"]),
    expired: z.boolean(),
    expiresAt: z.string(),
    acceptedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("AdminInvitation");

export const adminInvitationListSchema = z
  .object({
    rows: z.array(adminInvitationSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("AdminInvitationList");

export const adminInvitationListQuerySchema = z.object({
  campaignId: z.string().min(1),
  /** ILIKE over the invitee email and the prefill name/surnames. */
  q: z.string().trim().max(200).optional(),
  /** `expired` is the read-time computed state, not a stored status. */
  status: z.enum(["pending", "accepted", "cancelled", "expired"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const invitationIdParamSchema = z.object({
  id: z.string().min(1).openapi({ example: "invitation_123" }),
});

export const adminCreateInvitationBodySchema = z
  .object({
    campaignId: z.string().min(1),
    email: z.string().trim().toLowerCase().email(),
    intendedRole: invitationRoleSchema.default("member"),
    prefillName: z.string().trim().min(1).max(120).optional(),
    prefillSurnames: z.string().trim().min(1).max(120).optional(),
    /**
     * Required when `email` is not a `udl.cat` address — the invite form's
     * explicit confirmation step (lifecycle question 11).
     */
    allowExternalDomain: z.boolean().optional(),
  })
  .openapi("AdminCreateInvitationRequest");

export const adminInvitationActionResponseSchema = z
  .object({ status: z.literal("ok") })
  .openapi("AdminInvitationActionResponse");

export const invitationLookupBodySchema = z
  .object({ token: z.string().min(1) })
  .openapi("InvitationLookupRequest");

export const invitationLookupResponseSchema = z
  .object({
    email: z.string(),
    prefillName: z.string().nullable(),
    prefillSurnames: z.string().nullable(),
    campaignLabel: z.string(),
    /**
     * The same "we already know you" payload the public form gets after its
     * code step. Safe here for the same reason: holding the invitation token
     * is proof of control over the address it was sent to. An invited person
     * who was on the team two years ago should not have to retype anything.
     */
    known: z.boolean(),
    profile: knownProfileSchema.nullable(),
    memberships: z.array(knownMembershipSchema),
  })
  .openapi("InvitationLookupResponse");

export const invitationAcceptBodySchema = z
  .object({
    token: z.string().min(1),
    ...registrationProfileShape,
  })
  .openapi("InvitationAcceptRequest");

export const invitationAcceptResponseSchema = z
  .object({
    status: z.literal("accepted"),
    alreadyMember: z.boolean(),
  })
  .openapi("InvitationAcceptResponse");

// --- Admin: web-push notifications ------------------------------------------

export const pushPublicKeySchema = z
  .object({
    /** VAPID public key, base64url. Empty string means push is not configured. */
    publicKey: z.string(),
  })
  .openapi("PushPublicKey");

export const pushSubscribeBodySchema = z
  .object({
    /** `PushSubscription.endpoint` from the browser. */
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
    /** `navigator.userAgent`, so a device list can name the browser. */
    userAgent: z.string().max(500).optional(),
  })
  .openapi("PushSubscribeRequest");

export const pushSubscribeResponseSchema = z
  .object({ status: z.literal("subscribed") })
  .openapi("PushSubscribeResponse");

export const pushUnsubscribeBodySchema = z
  .object({ endpoint: z.string().url() })
  .openapi("PushUnsubscribeRequest");

export const pushUnsubscribeResponseSchema = z
  .object({ status: z.literal("unsubscribed") })
  .openapi("PushUnsubscribeResponse");

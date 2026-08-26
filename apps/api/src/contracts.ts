import { z } from "@hono/zod-openapi";

import { DEGREE_OPTIONS } from "@repo/constants/studies";

import { isValidPhone } from "./lib/phone";
import { API_VERSION } from "./version";

export const registrationRequestSchema = z
  .object({
    name: z.string().trim().min(2).openapi({ example: "Joan" }),
    surnames: z.string().trim().min(2).openapi({ example: "Garcia Serra" }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .refine((email) => {
        const domain = email.split("@").at(-1);
        return domain === "udl.cat" || domain?.endsWith(".udl.cat") === true;
      })
      .openapi({ example: "joan@alumnes.udl.cat" }),
    phone: z
      .string()
      .trim()
      .min(1)
      .refine(isValidPhone, "El número de telèfon no és vàlid")
      .openapi({ example: "+34 623 32 42 34" }),
    degree: z
      .enum(DEGREE_OPTIONS)
      .openapi({ example: "Grau en Informàtica (Lleida)" }),
    year: z.number().int().min(1).max(6).openapi({ example: 2 }),
    note: z.string().trim().max(2_000).optional().openapi({
      example: "M'interessen els intercanvis internacionals.",
    }),
  })
  .openapi("RegistrationRequest");

export const registrationCreatedSchema = z
  .object({
    status: z.literal("created"),
    id: z.string().openapi({ example: "registration_123" }),
  })
  .openapi("RegistrationCreated");

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

const REGISTRATION_STATUS_VALUES = [
  "pending_email",
  "pending_review",
  "accepted",
  "rejected",
] as const;

export const registrationStatusSchema = z
  .enum(REGISTRATION_STATUS_VALUES)
  .openapi("RegistrationStatus");

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
  .array(adminRegistrationSchema)
  .openapi("AdminRegistrationList");

export const adminListQuerySchema = z.object({
  campaignId: z.string().min(1).openapi({ example: "campaign_123" }),
  status: registrationStatusSchema.optional(),
});

export const registrationIdParamSchema = z.object({
  id: z.string().min(1).openapi({ example: "registration_123" }),
});

export const adminAcceptBodySchema = z
  .object({
    reviewerId: z.string().min(1).openapi({ example: "user_123" }),
    membershipSource: z.string().min(1).optional().openapi({
      example: "registration",
    }),
  })
  .openapi("AdminAcceptRequest");

export const adminRejectBodySchema = z
  .object({
    reviewerId: z.string().min(1).openapi({ example: "user_123" }),
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

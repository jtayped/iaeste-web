import { createRoute } from "@hono/zod-openapi";

import {
  adminAcceptBodySchema,
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
    // Decision (IA-40): always 201 once the row is written, even if the
    // verification email fails to send — see
    // repositories/registrations.ts's doc comment on `.create()` for why.
    // The client has no reliable way to tell "the email didn't send"
    // apart from "it's just slow", and `resend-verification` exists
    // exactly to recover from this without resubmitting the whole form.
    201: {
      description:
        "The registration was saved and, on a best-effort basis, a " +
        "verification email was sent. A 201 does not guarantee the email " +
        "arrived — see POST /v1/registrations/:id/resend-verification.",
      content: {
        "application/json": { schema: registrationCreatedSchema },
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
// UNAUTHENTICATED BY DESIGN — READ BEFORE TOUCHING THESE ROUTES.
//
// The plan places this task (IA-40) in Milestone 1 and real authentication
// (IA-30/IA-31, which protects admin API routes in Hono) in Milestone 2,
// strictly after it. There is currently NO session, NO admin-role check,
// and NO authorization of any kind on the three routes below — anyone who
// can reach this API can list every registration for a campaign, accept
// one (creating a real user + membership), or reject one. `reviewerId` is
// an unchecked, self-reported string; nothing verifies it names an actual
// admin.
//
// This is not an oversight. Do NOT bolt on an ad-hoc API key or other
// improvised auth here — IA-30/IA-31 will replace it wholesale, and a
// homemade scheme would just be thrown away. Until that lands:
//   - these routes MUST NOT be exposed on a public ingress, and
//   - MUST NOT be linked from any deployed frontend.
// ---------------------------------------------------------------------------

export const adminListRegistrationsRoute = createRoute({
  method: "get",
  path: "/v1/admin/registrations",
  operationId: "adminListRegistrations",
  tags: ["Admin"],
  description:
    "UNAUTHENTICATED (see the block comment above this route in " +
    "routes.ts). campaignId is required so omitting it can never list " +
    "across every campaign at once.",
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
  },
});

export const adminAcceptRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/admin/registrations/{id}/accept",
  operationId: "adminAcceptRegistration",
  tags: ["Admin"],
  description:
    "UNAUTHENTICATED (see the block comment above adminListRegistrations " +
    "in routes.ts). `reviewerId` is a self-reported user id, not verified " +
    "as an admin.",
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
  },
});

export const adminRejectRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/admin/registrations/{id}/reject",
  operationId: "adminRejectRegistration",
  tags: ["Admin"],
  description:
    "UNAUTHENTICATED (see the block comment above adminListRegistrations " +
    "in routes.ts). `reviewerId` is a self-reported user id, not verified " +
    "as an admin.",
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
  },
});

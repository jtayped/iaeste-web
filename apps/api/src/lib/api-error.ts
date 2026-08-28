import { apiErrorSchema } from "../contracts";

/**
 * Every error code this API emits. Kept as one exported union so route
 * handlers and middleware (`lib/admin-auth.ts`) build error bodies the same
 * way and the `apiErrorSchema` enum in `contracts.ts` stays the single
 * source of truth for what the OpenAPI document advertises.
 */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "ALREADY_REGISTERED"
  | "INVALID_TOKEN"
  | "INTERNAL_ERROR";

export function errorBody(
  requestIdValue: string,
  code: ApiErrorCode,
  message: string,
  details?: Array<{ path: Array<string | number>; message: string }>,
) {
  return apiErrorSchema.parse({
    error: { code, message, details },
    requestId: requestIdValue,
  });
}

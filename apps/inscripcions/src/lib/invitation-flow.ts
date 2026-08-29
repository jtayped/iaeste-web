import type { components } from "@repo/api-client";

type ApiError = components["schemas"]["ApiError"];
type LookupResponse = components["schemas"]["InvitationLookupResponse"];
type AcceptResponse = components["schemas"]["InvitationAcceptResponse"];

export type Invitation = LookupResponse;

/** `openapi-fetch`'s result, plus the status the rate-limit branch needs. */
interface ApiResult<TData> {
  data?: TData;
  error?: ApiError;
  response: Response;
}

/**
 * What `/convit` should render after looking the token up.
 *
 * `invalid` deliberately collapses expired, cancelled, already-used and
 * never-existed into one outcome: the API answers all four identically, on
 * purpose, so that the page cannot be used to probe which invitations exist.
 * `rateLimited` is kept apart because it is the one failure where the link is
 * still good and waiting actually helps.
 */
export type LookupOutcome =
  | { kind: "ok"; invitation: Invitation }
  | { kind: "invalid" }
  | { kind: "rateLimited" }
  | { kind: "failed" };

/**
 * The 429 carries the code `CONFLICT`, not a rate-limit code of its own, so
 * the HTTP status is the only reliable signal for it. `INVALID_TOKEN` is the
 * 400.
 */
function classify(result: {
  error?: ApiError;
  response: Response;
}): "invalid" | "rateLimited" | "failed" {
  if (result.response.status === 429) return "rateLimited";
  if (result.error?.error.code === "INVALID_TOKEN") return "invalid";
  return "failed";
}

export function mapLookupResult(
  result: ApiResult<LookupResponse>,
): LookupOutcome {
  if (result.data && !result.error) {
    return { kind: "ok", invitation: result.data };
  }
  return { kind: classify(result) };
}

/**
 * What to show once the form has been submitted. `alreadyMember` is not an
 * error — someone who follows the link twice, or who was already on the team
 * when they were invited, gets a different sentence, not a failure.
 */
export type AcceptOutcome =
  | { kind: "accepted"; alreadyMember: boolean }
  | { kind: "invalid" }
  | { kind: "rateLimited" }
  | { kind: "failed" };

export function mapAcceptResult(
  result: ApiResult<AcceptResponse>,
): AcceptOutcome {
  if (result.data?.status === "accepted" && !result.error) {
    return { kind: "accepted", alreadyMember: result.data.alreadyMember };
  }
  return { kind: classify(result) };
}

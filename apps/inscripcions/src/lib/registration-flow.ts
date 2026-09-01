import type { components } from "@repo/api-client";

type ApiError = components["schemas"]["ApiError"];
type RegistrationCreated = components["schemas"]["RegistrationCreated"];
type RegistrationSession = components["schemas"]["RegistrationSession"];
type StartResponse = components["schemas"]["RegistrationStartResponse"];
type Verified = components["schemas"]["Verified"];

export type Session = RegistrationSession;
export type KnownProfile = components["schemas"]["KnownProfile"];
export type KnownMembership = components["schemas"]["KnownMembership"];

/** A single field-level complaint the API made about the submitted body. */
export interface FieldIssue {
  /** Top-level field name, e.g. `phone`. Nested paths are flattened to their root. */
  field: string;
  message: string;
}

/** Shape returned by `openapi-fetch` for any request. */
interface ApiResult<TData> {
  data?: TData;
  error?: ApiError;
  response?: Response;
}

function toFieldIssues(error: ApiError): FieldIssue[] {
  const details = error.error.details ?? [];

  return details.flatMap((issue) => {
    const [root] = issue.path;
    if (root === undefined) return [];
    return [{ field: String(root), message: issue.message }];
  });
}

/**
 * What step one should do next.
 *
 * `closed` is the only condition this endpoint is allowed to reveal, and it
 * is about the committee's calendar rather than about the person asking. Every
 * other outcome is deliberately indistinguishable — see the route's doc
 * comment in the API.
 */
export type StartOutcome =
  | { kind: "sent"; resendAfterSeconds: number }
  | { kind: "closed" }
  | { kind: "rateLimited" }
  | { kind: "invalid"; issues: FieldIssue[] }
  | { kind: "failed" };

export function mapStartResult(result: ApiResult<StartResponse>): StartOutcome {
  const { data, error, response } = result;

  if (error) {
    // The 429 carries `CONFLICT` rather than a code of its own, so the HTTP
    // status is the only thing that separates it from a closed campaign.
    if (response?.status === 429) return { kind: "rateLimited" };
    switch (error.error.code) {
      case "CONFLICT":
        return { kind: "closed" };
      case "VALIDATION_ERROR":
        return { kind: "invalid", issues: toFieldIssues(error) };
      default:
        return { kind: "failed" };
    }
  }

  if (data?.status === "ok") {
    return { kind: "sent", resendAfterSeconds: data.resendAfterSeconds };
  }

  return { kind: "failed" };
}

export type VerifyCodeOutcome =
  | { kind: "ok"; session: Session }
  | { kind: "badCode" }
  | { kind: "identityConflict" }
  | { kind: "rateLimited" }
  | { kind: "failed" };

export function mapVerifyCodeResult(
  result: ApiResult<RegistrationSession>,
): VerifyCodeOutcome {
  const { data, error, response } = result;

  if (error) {
    if (response?.status === 429) return { kind: "rateLimited" };
    if (error.error.code === "INVALID_TOKEN") return { kind: "badCode" };
    if (error.error.code === "CONFLICT") return { kind: "identityConflict" };
    return { kind: "failed" };
  }

  return data ? { kind: "ok", session: data } : { kind: "failed" };
}

/**
 * What resuming or opening a legacy registration link should do next.
 */
export type VerifyDraftOutcome =
  | { kind: "ok"; session: Session }
  | { kind: "invalidLink" }
  | { kind: "identityConflict" }
  | { kind: "rateLimited" }
  | { kind: "failed" };

export function mapVerifyDraftResult(
  result: ApiResult<RegistrationSession>,
): VerifyDraftOutcome {
  const { data, error, response } = result;

  if (error) {
    if (response?.status === 429) return { kind: "rateLimited" };
    if (error.error.code === "INVALID_TOKEN") return { kind: "invalidLink" };
    if (error.error.code === "CONFLICT") return { kind: "identityConflict" };
    return { kind: "failed" };
  }

  return data ? { kind: "ok", session: data } : { kind: "failed" };
}

/**
 * What the details step should do next. Every branch maps to a distinct
 * screen — a closed campaign is not an error the applicant can fix by
 * retrying, and an already-registered address is not a validation problem.
 *
 * `expiredSession` is new: the address was proven, but the person left the
 * form open long enough for that proof to lapse. They have to redo the code
 * step, which is why it is a separate outcome from a generic failure.
 */
export type SubmitOutcome =
  | { kind: "created"; id: string; accepted: boolean }
  | { kind: "closed" }
  | { kind: "alreadyRegistered" }
  | { kind: "expiredSession" }
  | { kind: "invalid"; issues: FieldIssue[] }
  | { kind: "failed" };

export function mapSubmitResult(
  result: ApiResult<RegistrationCreated>,
): SubmitOutcome {
  const { data, error } = result;

  if (error) {
    switch (error.error.code) {
      case "CONFLICT":
        return { kind: "closed" };
      case "ALREADY_REGISTERED":
        return { kind: "alreadyRegistered" };
      case "INVALID_TOKEN":
        return { kind: "expiredSession" };
      case "VALIDATION_ERROR":
        return { kind: "invalid", issues: toFieldIssues(error) };
      default:
        return { kind: "failed" };
    }
  }

  if (data?.status === "created" && data.id) {
    return {
      kind: "created",
      id: data.id,
      accepted: data.outcome === "accepted",
    };
  }

  return { kind: "failed" };
}

/**
 * What `/verificar` should render. `INVALID_TOKEN` deliberately covers
 * invalid, expired, already-used and nonexistent tokens alike — the API never
 * tells them apart, so neither can this.
 *
 * Only reachable from a link in an email sent before the form moved its
 * verification step to the front. Kept working because those links are in
 * people's inboxes; nothing new sends one.
 */
export type VerifyOutcome =
  { kind: "verified" } | { kind: "invalidToken" } | { kind: "failed" };

export function mapVerifyResult(result: ApiResult<Verified>): VerifyOutcome {
  const { data, error } = result;

  if (error) {
    return error.error.code === "INVALID_TOKEN"
      ? { kind: "invalidToken" }
      : { kind: "failed" };
  }

  if (data?.status === "verified") return { kind: "verified" };

  return { kind: "failed" };
}

/**
 * Normalises a token from the current fragment or a legacy query parameter.
 * Verification and invitation links carry a 32-byte random value encoded as
 * 64 hex characters, so malformed values never need a request to the API.
 */
export function readToken(raw: string | null | undefined): string | undefined {
  const token = raw?.trim();
  return token && /^[a-f0-9]{64}$/i.test(token) ? token : undefined;
}

/**
 * Normalises a `?id=` query param. Used only to address the resend endpoint,
 * so anything that is not a plain opaque id is dropped instead of being
 * interpolated into a request path.
 */
export function readRegistrationId(
  raw: string | null | undefined,
): string | undefined {
  const id = raw?.trim();
  if (!id || id.length > 128) return undefined;
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : undefined;
}

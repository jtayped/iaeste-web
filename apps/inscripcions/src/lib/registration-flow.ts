import type { components } from "@repo/api-client";

type ApiError = components["schemas"]["ApiError"];
type RegistrationCreated = components["schemas"]["RegistrationCreated"];
type Verified = components["schemas"]["Verified"];

/** A single field-level complaint the API made about the submitted body. */
export interface FieldIssue {
  /** Top-level field name, e.g. `phone`. Nested paths are flattened to their root. */
  field: string;
  message: string;
}

/**
 * What the registration form should do next. Every branch here maps to a
 * distinct, deliberately different screen — a closed campaign is not an error
 * the user can fix by retrying, and an already-registered email is not a
 * validation problem.
 */
export type SubmitOutcome =
  | { kind: "created"; id: string }
  | { kind: "closed" }
  | { kind: "alreadyRegistered" }
  | { kind: "invalid"; issues: FieldIssue[] }
  | { kind: "failed" };

/** Shape returned by `openapi-fetch` for any request. */
interface ApiResult<TData> {
  data?: TData;
  error?: ApiError;
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
 * Maps `POST /v1/registrations` to a screen. The API distinguishes a closed
 * campaign (`CONFLICT`) from a duplicate registration (`ALREADY_REGISTERED`)
 * with the same 409 status, so the status code alone is never enough — the
 * error code is the signal.
 */
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
      case "VALIDATION_ERROR":
        return { kind: "invalid", issues: toFieldIssues(error) };
      default:
        return { kind: "failed" };
    }
  }

  if (data?.status === "created" && data.id)
    return { kind: "created", id: data.id };

  return { kind: "failed" };
}

/**
 * What `/verificar` should render. `INVALID_TOKEN` deliberately covers
 * invalid, expired, already-used and nonexistent tokens alike — the API never
 * tells them apart, so neither can this.
 */
export type VerifyOutcome =
  | { kind: "verified" }
  | { kind: "invalidToken" }
  | { kind: "failed" };

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
 * Normalises a `?token=` query param. A missing or blank token is treated as
 * an unusable link locally rather than being sent to the API, which would
 * answer `INVALID_TOKEN` anyway.
 */
export function readToken(raw: string | null | undefined): string | undefined {
  const token = raw?.trim();
  return token ? token : undefined;
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

/**
 * Turning an API response into something a screen can render.
 *
 * The rule from the root `AGENTS.md` is that errors surface. So every query
 * and mutation in this app runs its result through `unwrap`, which either
 * returns the body or throws an `ApiRequestError` carrying both a Catalan
 * sentence for the user and the API's own message for whoever has to debug it.
 */

/** The `error.code` values the API can return. */
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

const CODE_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: "les dades no són vàlides",
  UNSUPPORTED_MEDIA_TYPE: "format de petició no acceptat",
  PAYLOAD_TOO_LARGE: "la petició és massa gran",
  UNAUTHENTICATED: "la sessió ha caducat: torna a entrar",
  FORBIDDEN: "no tens permís per fer això",
  NOT_FOUND: "no s'ha trobat",
  CONFLICT: "l'estat ha canviat mentrestant",
  ALREADY_REGISTERED: "ja hi ha una inscripció per aquesta adreça",
  INVALID_TOKEN: "l'enllaç no és vàlid",
  INTERNAL_ERROR: "error intern de l'api",
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | undefined;
  /**
   * The API's own English message. Shown as the secondary line of a toast and
   * in `ErrorState`: it is what makes a 409 diagnosable in under a minute.
   */
  readonly detail: string | undefined;

  constructor(
    message: string,
    status: number,
    code?: ApiErrorCode,
    detail?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function readApiError(
  body: unknown,
): { code: ApiErrorCode; message: string } | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return undefined;

  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code !== "string") return undefined;

  return {
    code: code as ApiErrorCode,
    message: typeof message === "string" ? message : "",
  };
}

/** Shape `openapi-fetch` returns from every call. */
export interface ApiResult<T> {
  data?: T | undefined;
  error?: unknown;
  response: Response;
}

/**
 * Returns the response body, or throws an `ApiRequestError`.
 *
 * A network failure never reaches here — `fetch` rejects before the result
 * exists — so callers that want to distinguish "the API said no" from "the API
 * was unreachable" catch both and check `instanceof ApiRequestError`.
 */
export function unwrap<T>(result: ApiResult<T>): T {
  if (result.error === undefined && result.data !== undefined) {
    return result.data;
  }

  const status = result.response.status;
  const parsed = readApiError(result.error);

  if (parsed) {
    throw new ApiRequestError(
      CODE_MESSAGES[parsed.code] ?? `l'api ha respost ${status}`,
      status,
      parsed.code,
      parsed.message || undefined,
    );
  }

  throw new ApiRequestError(`l'api ha respost ${status}`, status);
}

/** The Catalan sentence for any thrown value, for a toast or `ErrorState`. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return "error desconegut";
}

/** The secondary, English detail line, when there is one. */
export function errorDetail(error: unknown): string | undefined {
  return error instanceof ApiRequestError ? error.detail : undefined;
}

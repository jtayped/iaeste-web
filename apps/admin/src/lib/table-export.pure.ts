import { LIST_EXPORT_MAX_ROWS } from "@repo/constants/validators/admin-list";

import { ApiRequestError, errorMessage } from "@/lib/api-error";

/**
 * The decisions `useTableExport` makes, without a toast or a DOM to make them
 * in, so they can be tested as plain functions.
 */

/**
 * The name the API gave the file in `Content-Disposition`, or `fallback`.
 *
 * The API writes a quoted ASCII `filename="membres-2026-10-07.csv"`; a bare
 * token is accepted too. The fallback only covers a response that lost the
 * header on the way, so it does not try to rebuild the API's naming.
 */
export function attachmentFilename(
  contentDisposition: string | null,
  fallback: string,
): string {
  const match = contentDisposition?.match(
    /filename="([^"]+)"|filename=([^;\s]+)/i,
  );
  return match?.[1] ?? match?.[2] ?? fallback;
}

/** `/v1/admin/members/export` → `members.csv`. */
export function exportFallbackFilename(path: string): string {
  return `${path.split("/").at(-2) ?? "export"}.csv`;
}

const TOO_MANY_ROWS = `només es poden exportar ${LIST_EXPORT_MAX_ROWS.toLocaleString("ca")} files d'un cop: afina la cerca o els filtres`;

/**
 * The toast title for a failed export.
 *
 * An export route answers `CONFLICT` only when more rows match than one file
 * may hold. The generic copy for that code says the state changed under you,
 * which would send someone to retry a request that will fail the same way.
 */
export function exportErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.code === "CONFLICT") {
    return TOO_MANY_ROWS;
  }
  return errorMessage(error);
}

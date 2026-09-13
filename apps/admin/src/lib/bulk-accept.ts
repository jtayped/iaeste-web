import type { AdminBulkAcceptRegistrationsResponse } from "@/lib/admin-types";
import type { DataTableSelectionValue } from "@/components/data-table/types";

/**
 * The pure half of a bulk accept: the selection rename, and the sentence that
 * reports what actually happened. Kept out of the hook so both can be tested
 * without a query client.
 */

/** What `POST /v1/admin/registrations/bulk-accept` takes as its selection. */
export type BulkAcceptSelection =
  | { mode: "ids"; registrationIds: string[] }
  | { mode: "all"; q?: string; excludedRegistrationIds: string[] };

/**
 * The table's selection speaks `rowIds` / `excludedRowIds`; this route speaks
 * `registrationIds` / `excludedRegistrationIds`. The rename happens here, once.
 */
export function bulkAcceptSelection(
  selection: DataTableSelectionValue,
  q: string,
): BulkAcceptSelection {
  if (selection.mode === "ids") {
    return { mode: "ids", registrationIds: [...selection.rowIds] };
  }
  return {
    mode: "all",
    ...(q ? { q } : {}),
    excludedRegistrationIds: [...selection.excludedRowIds],
  };
}

/**
 * The honest sentence for a bulk accept.
 *
 * The API silently skips rows that are no longer `pending_review` and reports
 * notification failures separately, so the result can legitimately be smaller
 * than the selection. Saying only "38 acceptades" when two were already
 * reviewed and one never got its email is the failure mode this exists to
 * prevent — every non-zero number gets named.
 */
export function bulkAcceptSummary(
  result: AdminBulkAcceptRegistrationsResponse,
): string {
  const parts = [
    result.accepted === 1 ? "1 acceptada" : `${result.accepted} acceptades`,
  ];
  if (result.skipped > 0) {
    parts.push(
      result.skipped === 1
        ? "1 ja estava revisada"
        : `${result.skipped} ja estaven revisades`,
    );
  }
  if (result.failed.length > 0) {
    parts.push(
      result.failed.length === 1
        ? "1 no s'ha pogut acceptar"
        : `${result.failed.length} no s'han pogut acceptar`,
    );
  }
  if (result.notificationsFailed.length > 0) {
    parts.push(
      result.notificationsFailed.length === 1
        ? "1 sense correu"
        : `${result.notificationsFailed.length} sense correu`,
    );
  }
  return parts.join(" · ");
}

/** Addresses that need chasing by hand, named rather than counted. */
export function bulkAcceptDetail(
  result: AdminBulkAcceptRegistrationsResponse,
): string | undefined {
  const addresses = [
    ...result.failed.map((failure) => failure.email),
    ...result.notificationsFailed.map((failure) => failure.email),
  ];
  return addresses.length > 0 ? addresses.join(", ") : undefined;
}

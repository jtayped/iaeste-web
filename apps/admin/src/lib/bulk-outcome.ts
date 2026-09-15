import { toast } from "@repo/ui/toast";

import {
  bulkOutcomeDetail,
  bulkOutcomeSummary,
  type BulkOutcome,
} from "@/lib/bulk-outcome.pure";

export {
  bulkOutcomeDetail,
  bulkOutcomeSummary,
  type BulkOutcome,
} from "@/lib/bulk-outcome.pure";

/**
 * How a bulk action tells the operator what happened.
 *
 * Green only when nothing failed. A partial failure is a warning however good
 * the ratio is: the description carries names somebody has to chase by hand,
 * and a success toast is the one people dismiss without reading. Every
 * non-zero count is named in the summary — "38 acceptades" alone, when two
 * were skipped and one failed, is the report this exists to prevent.
 */
export function reportBulkOutcome(outcome: BulkOutcome): void {
  const summary = bulkOutcomeSummary(outcome);
  const detail = bulkOutcomeDetail(outcome);

  if (detail === undefined) {
    toast.success(summary);
    return;
  }
  toast.warning(summary, { description: detail });
}

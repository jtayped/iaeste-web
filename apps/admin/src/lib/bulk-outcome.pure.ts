/**
 * How every bulk action reports what actually happened — the sentences only.
 *
 * They live apart from the toast because `@repo/ui/toast` cannot be loaded by
 * a `node:test` run (`@heroui/react` publishes ESM-only subpaths and
 * `packages/ui` is CommonJS to Node), and this is the half worth testing.
 * Import from `./bulk-outcome`, which re-exports all of it alongside
 * `reportBulkOutcome`.
 *
 * A bulk route is allowed to do less than it was asked: rows move out from
 * under a selection, a notification bounces, one record refuses. Saying only
 * "38 acceptades" when two were skipped and one failed is the failure mode
 * this module exists to prevent — every non-zero number gets named, and the
 * names of the failures go in the description, because someone has to chase
 * them by hand.
 *
 * The labels are the caller's: only it knows the participle and the unit that
 * agree in Catalan ("2 ja estaven revisades" vs "2 ja estaven revisats"), and
 * only it knows whether one is "1 invitació" or "1 correu".
 */
export interface BulkOutcome {
  /** "38 acceptades". The caller supplies the participle, agreed with the unit. */
  done: { count: number; label: (n: number) => string };
  /** Each skip reason, counted: "2 ja estaven revisades". */
  skipped: { count: number; label: (n: number) => string }[];
  /** Each hard failure, named so someone can chase it. */
  failed: { label: string; reason: string }[];
  /**
   * How the failures are counted in the summary — "1 no s'ha pogut acceptar".
   * Optional because the generic "no s'han pogut fer" is always true; supply
   * it when the action has a verb worth naming.
   */
  failedLabel?: (n: number) => string;
}

/** "38 acceptades · 2 ja estaven revisades · 1 no s'ha pogut acceptar" */
export function bulkOutcomeSummary(outcome: BulkOutcome): string {
  const parts = [outcome.done.label(outcome.done.count)];
  for (const skip of outcome.skipped) {
    // A reason nothing landed under says nothing; it would only be noise
    // between the two numbers that matter.
    if (skip.count > 0) parts.push(skip.label(skip.count));
  }
  if (outcome.failed.length > 0) {
    const count = outcome.failed.length;
    parts.push(
      outcome.failedLabel
        ? outcome.failedLabel(count)
        : count === 1
          ? "1 no s'ha pogut fer"
          : `${count} no s'han pogut fer`,
    );
  }
  return parts.join(" · ");
}

/** The named failures, or undefined. */
export function bulkOutcomeDetail(outcome: BulkOutcome): string | undefined {
  if (outcome.failed.length === 0) return undefined;
  return outcome.failed
    .map((failure) => `${failure.label}: ${failure.reason}`)
    .join(", ");
}

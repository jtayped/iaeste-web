import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

/**
 * Shown only when someone is actually waiting on the committee. It is the one
 * place on the dashboard that uses the navy `--primary` fill, which is what
 * makes it read as "do this" rather than as another statistic.
 *
 * Renders nothing at zero: a permanent "0 pendents" banner trains people to
 * ignore the spot where the real one will appear.
 */
export function PendingWork({ pendingReview }: { pendingReview: number }) {
  if (pendingReview <= 0) return null;

  const plural = pendingReview === 1 ? "sol·licitud" : "sol·licituds";

  return (
    // Stacked on a phone, one row from `sm`. Sharing a single flex row at
    // 360px left the sentence ~90px to live in — it wrapped to three lines
    // beside a button that had taken a third of the width. The button goes
    // full-width underneath instead, which is also where a thumb is.
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-default/40 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Inbox className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">feina pendent</p>
          <p className="text-sm text-muted-foreground">
            {pendingReview} {plural} amb el correu verificat esperen revisió.
          </p>
        </div>
      </div>
      <Link
        href="/registrations"
        className={cn(
          buttonVariants({ size: "sm" }),
          // 44px tall on a phone — this is the dashboard's one primary action
          // and `size="sm"` alone lands under the touch-target floor.
          "min-h-11 w-full shrink-0 gap-1.5 sm:min-h-9 sm:w-auto",
        )}
      >
        revisa-les
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

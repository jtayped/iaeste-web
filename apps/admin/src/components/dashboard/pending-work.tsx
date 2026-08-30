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
    <section className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-default/40 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Inbox className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium">feina pendent</p>
        <p className="text-sm text-muted-foreground">
          {pendingReview} {plural} amb el correu verificat esperen revisió.
        </p>
      </div>
      <Link
        href="/registrations"
        className={cn(
          buttonVariants({ size: "sm" }),
          // 44px tall on a phone — this is the dashboard's one primary action
          // and `size="sm"` alone lands under the touch-target floor.
          "min-h-11 shrink-0 gap-1.5 sm:min-h-9",
        )}
      >
        revisa-les
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

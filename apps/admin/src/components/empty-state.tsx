import type { LucideIcon } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

/**
 * The one empty/idle surface the whole app uses — "nothing here yet", "not
 * built yet", "nothing matched". A dashed hairline rather than a card: it
 * reads as an absence of content instead of as content that happens to be
 * blank.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

/**
 * The one empty/idle surface the whole app uses — "nothing here yet", "not
 * built yet", "nothing matched". Centred content and no frame of its own: an
 * empty result is a normal answer to a query, so it belongs inside whatever
 * container the answer would have filled, and it was the dashed hairline that
 * made it read as a drop target or an unbuilt slot instead.
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
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
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

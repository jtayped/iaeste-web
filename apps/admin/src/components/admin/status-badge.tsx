import { Badge } from "@repo/ui/badge";

import type { Labelled } from "@/lib/labels";

/**
 * The one way a status is drawn in this app. It takes the `{ label, tone }`
 * pair straight from `src/lib/labels.ts`, so a status cannot be worded one way
 * on the list and another on the detail page.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: Labelled;
  className?: string;
}) {
  return (
    <Badge
      variant={status.tone}
      className={className}
      // Statuses are read, not clicked; without this the badge is a focus
      // target that goes nowhere on a keyboard pass.
      tabIndex={-1}
    >
      {status.label}
    </Badge>
  );
}

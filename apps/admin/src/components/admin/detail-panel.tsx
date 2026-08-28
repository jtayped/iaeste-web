import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

/**
 * The layout the three detail pages share: a titled section, and inside it a
 * label/value list that stacks on a phone and becomes two columns once there
 * is room. Kept here rather than repeated per page so the profile block on a
 * registration and the one on a member read as the same object.
 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function FieldList({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-lg border-border p-0 shadow-none">
      <dl className="divide-y divide-border">{children}</dl>
    </Card>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-xs text-muted-foreground sm:w-44 sm:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  );
}

/**
 * The action row on a detail page.
 *
 * On a phone the buttons are full-width and stacked at the bottom of the
 * content, which is where a thumb is — the mobile rule in `AGENTS.md` rules
 * out a top-right button row. From `sm` up they collapse into a normal
 * left-aligned toolbar.
 */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:min-h-9 sm:[&>*]:w-auto">
      {children}
    </div>
  );
}

import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

/**
 * The layout the three detail pages share: a titled section, an optional
 * action beside the title, an optional line explaining what the block does,
 * and one surface underneath.
 *
 * Everything on a fitxa goes through it — a profile table, a history rail, a
 * form, a row of buttons — so that five blocks on one page read as five parts
 * of one record instead of five different objects. The one deliberate
 * exception is the destructive block, which passes its own frame through
 * `className` precisely so that it does *not* look like the rest.
 *
 * The width cap lives here rather than on the page: a label/value row stretched
 * across the full container leaves a metre of nothing between the two halves
 * of the same fact.
 */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("max-w-3xl space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {action}
      </div>
      {description ? <SectionNote>{description}</SectionNote> : null}
      {children}
    </section>
  );
}

/** Prose inside a section, held to a readable measure instead of the column. */
export function SectionNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("max-w-[72ch] text-xs text-muted-foreground", className)}>
      {children}
    </p>
  );
}

/** The surface a section's content sits on. `p-4` for anything but a list. */
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-lg border-border p-0 shadow-none", className)}>
      {children}
    </Card>
  );
}

export function FieldList({ children }: { children: React.ReactNode }) {
  return (
    <Panel>
      <dl className="divide-y divide-border">{children}</dl>
    </Panel>
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
      <dd className="min-w-0 flex-1 text-sm break-words">{children}</dd>
    </div>
  );
}

/** How prominent a timeline marker is: where the record stands right now. */
export type TimelineTone = "muted" | "active" | "danger";

const MARKER_TONE: Record<TimelineTone, string> = {
  muted: "bg-muted-foreground/60",
  active: "bg-primary",
  danger: "bg-destructive",
};

export function Timeline({ children }: { children: React.ReactNode }) {
  return <ol>{children}</ol>;
}

/**
 * One stop on a history rail.
 *
 * The rule is drawn per item and skipped on the last one, rather than once
 * down the container: a single border on the list runs past the final marker
 * and leaves the trail hanging in the air, which is what made the dots read as
 * decoration instead of a timeline.
 */
export function TimelineItem({
  tone = "muted",
  last = false,
  children,
}: {
  tone?: TimelineTone;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pb-5 pl-6 last:pb-0">
      {last ? null : (
        <span
          aria-hidden
          className="absolute top-4 bottom-0 left-[3.5px] w-px bg-border"
        />
      )}
      <span
        aria-hidden
        className={cn(
          "absolute top-[7px] left-0 size-2 rounded-full ring-2 ring-background",
          MARKER_TONE[tone],
        )}
      />
      {children}
    </li>
  );
}

/**
 * One action with the sentence that says what it does to the record and
 * whether it can be taken back.
 *
 * The two live on the same row so that two buttons stacked in the same block
 * can never be told apart only by their verb — which is how `expulsa` came to
 * look exactly like `dona de baixa`.
 */
export function ActionRow({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <SectionNote>{note}</SectionNote>
      </div>
      <ActionBar className="sm:shrink-0">{children}</ActionBar>
    </div>
  );
}

/**
 * The action row inside a section.
 *
 * On a phone the buttons are full-width and stacked at the bottom of the
 * content, which is where a thumb is — the mobile rule in `AGENTS.md` rules
 * out a top-right button row. From `sm` up they collapse into a normal
 * left-aligned toolbar.
 */
export function ActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:min-h-9 sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

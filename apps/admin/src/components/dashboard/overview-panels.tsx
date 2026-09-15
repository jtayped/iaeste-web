import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

import type { AdminOverviewCounts } from "@/lib/overview";

interface Metric {
  label: string;
  value: number;
  hint: string;
  /** Absent when the reader lacks the capability behind the destination. */
  href?: string;
  emphasis?: boolean;
}

function MetricBody({
  metric,
  featured,
}: {
  metric: Metric;
  featured: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm text-muted-foreground">{metric.label}</p>
        {metric.href ? (
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:-translate-y-0.5 group-hover:text-link group-focus-visible:text-link"
            aria-hidden
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 font-semibold tracking-tight tabular-nums",
          featured ? "text-4xl" : "text-3xl",
          metric.emphasis && metric.value > 0 ? "text-primary" : null,
        )}
      >
        {metric.value}
      </p>
      <p className="mt-1 max-w-[36ch] text-xs text-muted-foreground">
        {metric.hint}
      </p>
    </>
  );
}

/**
 * Every card that goes somewhere says so the same way: the arrow sits in the
 * corner of the card it belongs to, the whole card is the hit area, and it
 * lifts on hover and rings on focus. A card that carried no affordance used to
 * read as a dead statistic sitting next to four live ones.
 *
 * A card with no `href` is the other case: the reader cannot open the page
 * behind the number, so it keeps the shape and drops the arrow and every hover
 * cue rather than offering a link that would redirect them straight back.
 */
function MetricCard({
  metric,
  featured = false,
}: {
  metric: Metric;
  featured?: boolean;
}) {
  const padding = featured ? "p-5 sm:p-6" : "p-4 sm:p-5";

  if (!metric.href) {
    return (
      <Card className="rounded-lg border-border p-0 shadow-none">
        <div className={cn("flex h-full flex-col", padding)}>
          <MetricBody metric={metric} featured={featured} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border-border p-0 shadow-none transition-colors focus-within:border-secondary/40 hover:border-secondary/40 hover:bg-default/40">
      <Link
        href={metric.href}
        className={cn(
          "group flex h-full flex-col rounded-lg ring-ring outline-none focus-visible:ring-2",
          padding,
        )}
      >
        <MetricBody metric={metric} featured={featured} />
      </Link>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

/**
 * `linked` is off for anyone without `members.read`. The numbers themselves are
 * aggregates and safe to show a member; the cards behind them are not, and a
 * card that quietly redirects you back to the page you are already on is worse
 * than a card that was never clickable.
 */
export function TeamOverview({
  counts,
  linked = true,
  className,
}: {
  counts: AdminOverviewCounts;
  linked?: boolean;
  className?: string;
}) {
  const members = linked ? "/members" : undefined;
  const breakdown: Metric[] = [
    {
      label: "nous",
      value: counts.newMembers,
      hint: "primera campanya amb nosaltres",
      href: members,
    },
    {
      label: "ogs",
      value: counts.returningMembers,
      hint: "ja havien estat membres abans",
      href: members,
    },
    {
      label: "sense renovar",
      value: counts.unrenewedPastMembers,
      hint: "encara no s'han donat d'alta aquest curs",
      href: members,
    },
  ];

  return (
    <section className={cn("space-y-3", className)}>
      <SectionTitle>equip</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          featured
          metric={{
            label: "membres actius",
            value: counts.activeMembers,
            hint: "amb l'alta vigent a la campanya actual",
            href: members,
          }}
        />
        {breakdown.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}

export function RegistrationOverview({
  counts,
  className,
}: {
  counts: AdminOverviewCounts;
  className?: string;
}) {
  const metrics: Metric[] = [
    {
      label: "pendents de verificar",
      value: counts.pendingVerification,
      hint: "encara no han confirmat el correu",
      href: "/registrations?status=pending_email",
    },
    {
      label: "pendents de revisar",
      value: counts.pendingReview,
      hint: "esperen la decisió del comitè",
      href: "/registrations?status=pending_review",
      emphasis: true,
    },
  ];

  return (
    <section className={cn("space-y-3", className)}>
      <SectionTitle>sol·licituds</SectionTitle>
      {/* Side by side until the section is sharing a wide screen with the
          team panel, where it holds a single column track. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}

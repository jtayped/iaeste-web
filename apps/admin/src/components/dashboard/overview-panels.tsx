import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

import type { AdminOverviewCounts } from "@/lib/overview";

interface Metric {
  label: string;
  value: number;
  hint: string;
  href?: string;
  emphasis?: boolean;
}

function MetricBody({
  metric,
  featured = false,
}: {
  metric: Metric;
  featured?: boolean;
}) {
  return (
    <div className={cn("h-full", featured ? "p-5" : "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p
            className={cn(
              "mt-2 font-semibold tracking-tight tabular-nums",
              featured ? "text-4xl" : "text-2xl",
              metric.emphasis && metric.value > 0 ? "text-primary" : null,
            )}
          >
            {metric.value}
          </p>
        </div>
        {metric.href ? (
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-secondary"
            aria-hidden
          />
        ) : null}
      </div>
      <p className="mt-1 max-w-[36ch] text-xs text-muted-foreground">
        {metric.hint}
      </p>
    </div>
  );
}

function MetricCell({
  metric,
  featured,
}: {
  metric: Metric;
  featured?: boolean;
}) {
  if (!metric.href) return <MetricBody metric={metric} featured={featured} />;

  return (
    <Link
      href={metric.href}
      className="group block h-full rounded-md ring-ring outline-none hover:bg-default/50 focus-visible:ring-2"
    >
      <MetricBody metric={metric} featured={featured} />
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

export function TeamOverview({ counts }: { counts: AdminOverviewCounts }) {
  const breakdown: Metric[] = [
    {
      label: "nous",
      value: counts.newMembers,
      hint: "primera campanya amb nosaltres",
      href: "/members",
    },
    {
      label: "ogs",
      value: counts.returningMembers,
      hint: "ja havien estat membres abans",
      href: "/members",
    },
    {
      label: "sense renovar",
      value: counts.unrenewedPastMembers,
      hint: "encara no s'han donat d'alta aquest curs",
      href: "/members",
    },
  ];

  return (
    <section className="space-y-3">
      <SectionTitle>equip</SectionTitle>
      <Card className="overflow-hidden rounded-lg border-border p-0 shadow-none">
        <div className="border-b border-border">
          <MetricCell
            featured
            metric={{
              label: "membres actius",
              value: counts.activeMembers,
              hint: "amb l'alta vigent a la campanya actual",
              href: "/members",
            }}
          />
        </div>
        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {breakdown.map((metric) => (
            <MetricCell key={metric.label} metric={metric} />
          ))}
        </div>
      </Card>
    </section>
  );
}

export function RegistrationOverview({
  counts,
}: {
  counts: AdminOverviewCounts;
}) {
  const metrics: Metric[] = [
    {
      label: "pendents de verificar",
      value: counts.pendingVerification,
      hint: "encara no han confirmat el correu",
    },
    {
      label: "pendents de revisar",
      value: counts.pendingReview,
      hint: "esperen la decisió del comitè",
      href: "/registrations",
      emphasis: true,
    },
  ];

  return (
    <section className="space-y-3">
      <SectionTitle>sol·licituds</SectionTitle>
      <Card className="grid overflow-hidden rounded-lg border-border p-0 shadow-none sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="border-b border-border last:border-b-0 sm:border-b-0"
          >
            <MetricCell metric={metric} />
          </div>
        ))}
      </Card>
    </section>
  );
}

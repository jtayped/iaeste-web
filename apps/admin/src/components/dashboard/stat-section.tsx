import { StatCard, type Stat } from "@/components/dashboard/stat-card";

/** A titled row of stat cards. Three across on desktop, one on a phone. */
export function StatSection({
  title,
  stats,
}: {
  title: string;
  stats: Stat[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}

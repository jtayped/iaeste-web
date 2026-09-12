import { Activity, CircleHelp, PauseCircle } from "lucide-react";

import { formatDateLong } from "@/lib/format";
import {
  describeElapsed,
  formatCount,
  formatDays,
  summariseActivity,
  type CrmActivity,
} from "@/lib/analytics";

function LastMovement({ lastActivityAt }: { lastActivityAt: string | null }) {
  if (!lastActivityAt) return null;
  return <> l&apos;últim va ser el {formatDateLong(lastActivityAt)}.</>;
}

/**
 * The dormancy callout. It is deliberately *not* an `ErrorState`: nothing
 * failed here, and a page that opens with a plug icon teaches everyone to
 * stop reading. Amber, a paused icon, and a sentence that names the
 * distinction out loud.
 */
function DormantCallout({
  days,
  lastActivityAt,
}: {
  days: number;
  lastActivityAt: string | null;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-[color-mix(in_oklab,var(--warning)_45%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] p-4">
      <PauseCircle
        className="mt-0.5 size-5 shrink-0 text-[var(--warning-soft-foreground)]"
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold">el crm està aturat</p>
        <p className="text-sm text-muted-foreground">
          fa{" "}
          <span className="font-medium text-foreground">
            {formatDays(days)}
          </span>{" "}
          ({describeElapsed(days)}) que ningú no toca cap lead a odoo.
          <LastMovement lastActivityAt={lastActivityAt} />
        </p>
        <p className="text-sm text-muted-foreground">
          el que hi ha a sota descriu una base de dades aturada, no un error de
          càrrega: les xifres són correctes i no s&apos;han mogut des
          d&apos;aleshores.
        </p>
      </div>
    </div>
  );
}

/** The quiet version: recent enough not to alarm, still worth stating. */
function RecentActivity({
  days,
  activity,
  showCounters,
}: {
  days: number;
  activity: CrmActivity;
  showCounters: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border p-4 text-sm">
      <span className="flex items-center gap-2">
        <Activity
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="text-muted-foreground">últim moviment</span>
        <span className="font-medium">{formatDays(days)}</span>
      </span>
      {activity.lastActivityAt ? (
        <span className="text-muted-foreground">
          {formatDateLong(activity.lastActivityAt)}
        </span>
      ) : null}
      {showCounters ? (
        <span className="text-muted-foreground">
          {formatCount(activity.touchedLast7Days)} leads tocats en 7 dies ·{" "}
          {formatCount(activity.touchedLast30Days)} en 30
        </span>
      ) : null}
    </div>
  );
}

/**
 * How the page opens.
 *
 * The counters for the last 7 and 30 days are both `0` today, and a tile
 * reading `0` is the one thing that must not lead: a bare zero looks like a
 * broken query, while "fa 176 dies" is a fact about the committee. So when
 * both windows are silent the elapsed time replaces them entirely — see
 * `summariseActivity`, which owns that decision and is tested.
 */
export function ActivityBanner({ activity }: { activity: CrmActivity }) {
  const summary = summariseActivity(activity);

  if (summary.mode === "unknown" || summary.days === null) {
    return (
      <div className="flex gap-3 rounded-lg border border-border p-4">
        <CircleHelp
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">
          odoo no ens dona cap data d&apos;activitat, així que no podem dir quan
          es va tocar un lead per última vegada.
        </p>
      </div>
    );
  }

  if (summary.dormant) {
    return (
      <DormantCallout
        days={summary.days}
        lastActivityAt={activity.lastActivityAt}
      />
    );
  }

  return (
    <RecentActivity
      days={summary.days}
      activity={activity}
      showCounters={summary.mode === "counters"}
    />
  );
}

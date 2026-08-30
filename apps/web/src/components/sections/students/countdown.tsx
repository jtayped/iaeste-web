"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React from "react";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const UNITS = ["days", "hours", "minutes", "seconds"] as const;

type Remaining = Record<(typeof UNITS)[number], number>;

/** `null` once the target is in the past. */
function remainingUntil(target: number): Remaining | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor((diff % DAY) / HOUR),
    minutes: Math.floor((diff % HOUR) / MINUTE),
    seconds: Math.floor((diff % MINUTE) / SECOND),
  };
}

const Countdown = ({ target, label }: { target: string; label: string }) => {
  const t = useTranslations("StudentsPage.registrations.countdown");
  const router = useRouter();
  const targetMs = new Date(target).getTime();

  // The server renders against its own clock at its own moment, so the first
  // client paint has to match its markup exactly. Real digits only arrive
  // once the effect has run.
  const [remaining, setRemaining] = React.useState<Remaining | null>(null);

  React.useEffect(() => {
    if (Number.isNaN(targetMs)) return;

    const initial = remainingUntil(targetMs);
    setRemaining(initial);

    // The window turned over while the page sat open: this band is now
    // describing the wrong half of the campaign, so let the server decide
    // what replaces it rather than guessing here.
    if (initial === null) {
      router.refresh();
      return;
    }

    const id = setInterval(() => {
      const next = remainingUntil(targetMs);
      setRemaining(next);
      if (next === null) {
        clearInterval(id);
        router.refresh();
      }
    }, SECOND);

    return () => clearInterval(id);
  }, [targetMs, router]);

  if (Number.isNaN(targetMs)) return null;

  return (
    // No `aria-live`: a region that re-announces itself every second is
    // unusable. `role="timer"` still lets it be found and read on demand.
    <div role="timer" aria-label={label}>
      <p className="text-xs uppercase tracking-[0.12em] text-primary-foreground/60">
        {label}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2.5">
        {UNITS.map((unit) => {
          const value = remaining?.[unit];
          return (
            <li
              key={unit}
              className="min-w-[4.75rem] rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-center"
            >
              <span className="block text-2xl font-semibold leading-none tabular-nums">
                {value === undefined
                  ? "--"
                  : String(value).padStart(2, "0")}
              </span>
              <span className="mt-1.5 block text-[11px] text-primary-foreground/60">
                {t(unit, { count: value ?? 0 })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Countdown;

/**
 * Date formatting for the admin screens.
 *
 * Everything here reads and writes **UTC** components rather than local ones.
 * That is deliberate: these values are rendered by server components and then
 * hydrated on the client, and `getDate()` on a server running UTC disagrees
 * with `getDate()` in a browser on `Europe/Madrid` for anything near midnight
 * — which React reports as a hydration mismatch. `Intl` has the same problem
 * one level down (a different resolved locale on each side), so the formatting
 * is done by hand.
 */

const MONTHS_CA = [
  "gen",
  "febr",
  "març",
  "abr",
  "maig",
  "juny",
  "jul",
  "ag",
  "set",
  "oct",
  "nov",
  "des",
] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `05/09/2026`. Returns `"—"` for a null or unparseable value. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

/** `5 set 2026`, for prose where the numeric form reads as a serial number. */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const month = MONTHS_CA[date.getUTCMonth()] ?? "";
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

/** `05/09/2026 · 14:32`, for the audit log where the hour matters. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(iso)} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/** `5 set 2026 – 30 juny 2027`, the shape a campaign's two dates read best in. */
export function formatDateRange(from: string, to: string): string {
  return `${formatDateLong(from)} – ${formatDateLong(to)}`;
}

/**
 * The `<DatePicker>` hands back a `Date` at *local* midnight. Serialising that
 * straight to ISO would shift it a day back in any timezone east of UTC, so
 * the day the admin clicked is re-anchored at 12:00 UTC — far enough from both
 * boundaries that no offset can move it onto a different date.
 */
export function toIsoDay(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12),
  ).toISOString();
}

/** The inverse: an ISO instant back to the local-midnight `Date` the picker wants. */
export function fromIsoDay(iso: string): Date | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** `fa 3 dies` / `d'aquí a 2 mesos`, relative to now. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const diffDays = Math.round((then - Date.now()) / 86_400_000);
  const magnitude = Math.abs(diffDays);

  if (magnitude === 0) return "avui";
  if (magnitude === 1) return diffDays < 0 ? "ahir" : "demà";
  if (magnitude < 30) {
    return diffDays < 0 ? `fa ${magnitude} dies` : `d'aquí a ${magnitude} dies`;
  }

  const months = Math.round(magnitude / 30);
  const unit = months === 1 ? "mes" : "mesos";
  return diffDays < 0 ? `fa ${months} ${unit}` : `d'aquí a ${months} ${unit}`;
}

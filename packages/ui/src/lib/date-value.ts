import {
  fromDate,
  getLocalTimeZone,
  toCalendarDate,
  type CalendarDate,
} from "@internationalized/date";

/**
 * The one typed boundary between `Date` (an instant) and React Aria's
 * `CalendarDate` (a calendar day — no time, no zone). `DatePicker`'s public
 * API takes and emits plain `Date`, because the admin's campaign form state
 * (`apps/admin/src/lib/campaign-form.ts`) is `Date`-based end to end, while
 * HeroUI/React Aria's `Calendar` speaks `CalendarDate`.
 *
 * Both directions go through the *local* time zone, never UTC: a `Date` at
 * local midnight and a `Date` at UTC midnight can name different calendar
 * days depending on where the browser sits, and only the local reading is
 * "the day the user picked" or "the day to show as picked". Going through
 * `getLocalTimeZone()` on both ends keeps a day picked in Europe/Madrid the
 * same day coming back out, DST transitions included — `CalendarDate` has no
 * time component to land on a skipped or repeated hour in the first place.
 */
export function dateToCalendarDate(
  date: Date | undefined,
): CalendarDate | undefined {
  if (!date) return undefined;
  return toCalendarDate(fromDate(date, getLocalTimeZone()));
}

/** The inverse: a calendar day back to the `Date` at local midnight on it. */
export function calendarDateToDate(
  date: CalendarDate | undefined | null,
): Date | undefined {
  if (!date) return undefined;
  return date.toDate(getLocalTimeZone());
}

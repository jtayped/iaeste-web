"use client";

import type { CalendarDate } from "@internationalized/date";
import {
  CalendarCell as HeroUICalendarCell,
  CalendarGrid as HeroUICalendarGrid,
  CalendarGridBody as HeroUICalendarGridBody,
  CalendarGridHeader as HeroUICalendarGridHeader,
  CalendarHeader as HeroUICalendarHeader,
  CalendarHeaderCell as HeroUICalendarHeaderCell,
  CalendarHeading as HeroUICalendarHeading,
  CalendarNavButton as HeroUICalendarNavButton,
  CalendarRoot as HeroUICalendarRoot,
  type CalendarRootProps as HeroUICalendarRootProps,
} from "@heroui/react/calendar";
import { useLocale } from "@heroui/react/rac";

export type CalendarProps = Omit<
  HeroUICalendarRootProps<CalendarDate, "single">,
  "children"
>;

/**
 * Everything the calendar *formats* — the month heading, the weekday row, a
 * day cell's announced date — follows the locale on React Aria's context, so
 * it is already Catalan inside the admin (see `i18n-provider.tsx`). The two
 * strings it *writes* are a different matter: React Aria ships no Catalan
 * bundle, so its own "Previous"/"Next" fall back to English. Supplying them
 * here is the whole fix, and only when the locale actually is Catalan — in
 * any other language React Aria's own bundle is right and should win.
 */
function useNavLabels(): { previous?: string; next?: string } {
  const { locale } = useLocale();

  if (!locale.toLowerCase().startsWith("ca")) return {};

  return { previous: "mes anterior", next: "mes següent" };
}

/**
 * A single-month day grid. Only ever reached through `DatePicker`'s popover,
 * so it takes React Aria's `CalendarDate` rather than a plain `Date` — the
 * `Date` boundary belongs one layer up, in `DatePicker` (`@repo/ui/lib/date-value`).
 * Pinned to `CalendarDate` rather than the broader `DateValue` union it
 * accepts by default, since this calendar never deals in times or zones.
 */
function Calendar(props: CalendarProps) {
  const navLabels = useNavLabels();

  return (
    <HeroUICalendarRoot {...props}>
      <HeroUICalendarHeader>
        <HeroUICalendarNavButton
          slot="previous"
          aria-label={navLabels.previous}
        />
        <HeroUICalendarHeading />
        <HeroUICalendarNavButton slot="next" aria-label={navLabels.next} />
      </HeroUICalendarHeader>
      <HeroUICalendarGrid>
        <HeroUICalendarGridHeader>
          {(day) => <HeroUICalendarHeaderCell>{day}</HeroUICalendarHeaderCell>}
        </HeroUICalendarGridHeader>
        <HeroUICalendarGridBody>
          {(date) => <HeroUICalendarCell date={date} />}
        </HeroUICalendarGridBody>
      </HeroUICalendarGrid>
    </HeroUICalendarRoot>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

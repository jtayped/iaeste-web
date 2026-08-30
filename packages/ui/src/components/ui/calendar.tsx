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

export type CalendarProps = Omit<
  HeroUICalendarRootProps<CalendarDate, "single">,
  "children"
>;

/**
 * A single-month day grid. Only ever reached through `DatePicker`'s popover,
 * so it takes React Aria's `CalendarDate` rather than a plain `Date` — the
 * `Date` boundary belongs one layer up, in `DatePicker` (`@repo/ui/lib/date-value`).
 * Pinned to `CalendarDate` rather than the broader `DateValue` union it
 * accepts by default, since this calendar never deals in times or zones.
 */
function Calendar(props: CalendarProps) {
  return (
    <HeroUICalendarRoot {...props}>
      <HeroUICalendarHeader>
        <HeroUICalendarNavButton slot="previous" />
        <HeroUICalendarHeading />
        <HeroUICalendarNavButton slot="next" />
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

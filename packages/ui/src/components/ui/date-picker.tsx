"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import {
  PopoverContent as HeroUIPopoverContent,
  PopoverRoot as HeroUIPopoverRoot,
} from "@heroui/react/popover";

import { cn } from "@repo/ui/lib/utils";
import {
  calendarDateToDate,
  dateToCalendarDate,
} from "@repo/ui/lib/date-value";
import { Button } from "@repo/ui/button";
import { Calendar, type CalendarProps } from "@repo/ui/calendar";

/**
 * Formats the trigger label. Without an explicit `locale` the output is a
 * fixed `DD/MM/YYYY`, which renders identically on the server and the client;
 * `Intl` would otherwise resolve a different locale in each and break
 * hydration. The calendar itself never has this problem — it only mounts
 * once the popover opens, which never happens during the server render.
 */
function formatDate(date: Date, locale?: string) {
  if (locale) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}/${date.getFullYear()}`;
}

export interface DatePickerProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Button>,
  "value" | "defaultValue" | "onChange" | "children"
> {
  /** The selected day. `undefined` renders the placeholder. */
  value?: Date;
  /** Called with the new day, or `undefined` when the day is cleared. */
  onChange?: (date: Date | undefined) => void;
  /** Text shown while nothing is selected. Defaults to `DD/MM/YYYY`. */
  placeholder?: string;
  /** BCP-47 tag used to format the selected day, e.g. `"ca-ES"`. */
  locale?: string;
  /** Passed through to the underlying `<Calendar />`. */
  calendarProps?: Omit<CalendarProps, "value" | "onChange" | "autoFocus">;
}

/**
 * A controlled single-day picker. Drop it straight into a `<FormField>`:
 *
 * ```tsx
 * <FormControl>
 *   <DatePicker value={field.value} onChange={field.onChange} />
 * </FormControl>
 * ```
 */
const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "DD/MM/YYYY",
      locale,
      calendarProps,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    return (
      <HeroUIPopoverRoot isOpen={open} onOpenChange={setOpen}>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          {...props}
        >
          <CalendarIcon />
          {value ? formatDate(value, locale) : placeholder}
        </Button>
        <HeroUIPopoverContent placement="bottom start" className="w-auto p-3">
          <Calendar
            {...calendarProps}
            value={dateToCalendarDate(value) ?? null}
            onChange={(date) => {
              onChange?.(calendarDateToDate(date));
              setOpen(false);
            }}
            autoFocus
          />
        </HeroUIPopoverContent>
      </HeroUIPopoverRoot>
    );
  },
);
DatePicker.displayName = "DatePicker";

export { DatePicker };

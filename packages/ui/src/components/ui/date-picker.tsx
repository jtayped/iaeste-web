"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/button";
import { Calendar, type CalendarProps } from "@repo/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";

/**
 * Formats the trigger label. Without an explicit `locale` the output is a
 * fixed `DD/MM/YYYY`, which renders identically on the server and the client;
 * `Intl` would otherwise resolve a different locale in each and break
 * hydration.
 */
function formatDate(date: Date, locale?: string) {
  if (locale) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}/${date.getFullYear()}`;
}

export interface DatePickerProps
  extends Omit<
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
  /**
   * Render the calendar as its own modal layer. Needed whenever the picker
   * lives inside another modal layer (a `Sheet`/`Dialog`): the calendar is
   * portalled to `document.body`, and without this the outer dialog's
   * `pointer-events: none` and focus trap make the days unclickable.
   */
  modal?: boolean;
  /** Passed through to the underlying `<Calendar />`. */
  calendarProps?: Omit<
    CalendarProps,
    "mode" | "selected" | "onSelect" | "defaultMonth"
  >;
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
      modal = false,
      calendarProps,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    return (
      <Popover open={open} onOpenChange={setOpen} modal={modal}>
        <PopoverTrigger asChild>
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
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            {...calendarProps}
            mode="single"
            selected={value}
            defaultMonth={value}
            onSelect={(date) => {
              onChange?.(date);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DatePicker.displayName = "DatePicker";

export { DatePicker };

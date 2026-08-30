"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { DayPicker, type ChevronProps } from "react-day-picker";

import { cn } from "@repo/ui/lib/utils";
import { buttonVariants } from "@repo/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const CalendarChevron = ({ className, orientation }: ChevronProps) => {
  const Icon =
    orientation === "up"
      ? ChevronUp
      : orientation === "down"
        ? ChevronDown
        : orientation === "right"
          ? ChevronRight
          : ChevronLeft;

  return <Icon className={cn("h-4 w-4", className)} />;
};
CalendarChevron.displayName = "CalendarChevron";

const navButtonClassName = cn(
  buttonVariants({ variant: "ghost" }),
  "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 aria-disabled:pointer-events-none aria-disabled:opacity-30",
);

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("relative p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex w-full flex-col gap-4",
        nav: "absolute inset-x-3 top-3 flex items-center justify-between",
        button_previous: navButtonClassName,
        button_next: navButtonClassName,
        month_caption: "flex h-7 items-center justify-center",
        caption_label: "text-sm font-medium",
        dropdowns: "flex h-7 items-center justify-center gap-2 text-sm",
        dropdown_root: "relative",
        dropdown:
          "absolute inset-0 h-full w-full cursor-pointer opacity-0 [&_option]:text-foreground",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        week_number_header: "w-9",
        week_number: "w-9 text-[0.8rem] text-muted-foreground",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground hover:[&>button]:bg-primary hover:[&>button]:text-primary-foreground focus:[&>button]:bg-primary focus:[&>button]:text-primary-foreground",
        today: "[&>button]:bg-default [&>button]:text-default-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_start: "rounded-l-md bg-default",
        range_end: "rounded-r-md bg-default",
        range_middle:
          "bg-default [&>button]:bg-transparent [&>button]:text-default-foreground hover:[&>button]:bg-transparent",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        ...components,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

import type { ProfileForm } from "@/lib/form-schema";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_HINT, FIELD_LABEL } from "../field-styles";

/** The schema accepts 1 to 6; no UdL degree runs longer. */
const YEARS = [1, 2, 3, 4, 5, 6] as const;

/**
 * A segmented control rather than a number input.
 *
 * Six values is small enough to show all at once, which removes a spinner, a
 * keyboard, and the `valueAsNumber` NaN that an emptied number input
 * produces. Real radio inputs do the work: arrow keys move between options
 * and each option is named without any extra ARIA.
 */
const YearField = ({ form }: { form: UseFormReturn<ProfileForm> }) => {
  return (
    <FormField
      control={form.control}
      name="year"
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className={FIELD_LABEL}>curs</FormLabel>
          <FormControl>
            <div
              role="radiogroup"
              aria-label="curs"
              className="grid grid-cols-6 gap-1.5"
            >
              {YEARS.map((year, index) => (
                <label
                  key={year}
                  className="relative cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={year}
                    checked={field.value === year}
                    onChange={() => field.onChange(year)}
                    onBlur={field.onBlur}
                    ref={index === 0 ? field.ref : undefined}
                    data-field-name={index === 0 ? "year" : undefined}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex h-11 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium tabular-nums text-muted-foreground shadow-sm transition-colors",
                      "hover:border-ring/40 hover:text-foreground",
                      "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                      "peer-focus-visible:outline-none peer-focus-visible:ring-1 peer-focus-visible:ring-ring",
                    )}
                  >
                    {year}
                  </span>
                </label>
              ))}
            </div>
          </FormControl>
          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </FormItem>
      )}
    />
  );
};

export default YearField;

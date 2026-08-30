import type { ProfileForm } from "@/lib/form-schema";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel } from "@repo/ui/form";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_HINT } from "../field-styles";

/** The schema accepts 1 to 6; no UdL degree runs longer. */
const YEARS = [1, 2, 3, 4, 5, 6] as const;

/**
 * A segmented control rather than a number input.
 *
 * Six values is small enough to show all at once, which removes a spinner, a
 * keyboard, and the `valueAsNumber` NaN that an emptied number input
 * produces. Real radio inputs do the work: arrow keys move between options
 * and each option is named without any extra ARIA.
 *
 * This is the one field with no HeroUI root above it — a `TextField` would be
 * a lie for a radio group — so it also owns the wiring a root would normally
 * hand it: the group is named by its own label and described by its own error
 * message. `FormMessage` is deliberately not used, because it only renders
 * inside a field root.
 */
const YearField = ({ form }: { form: UseFormReturn<ProfileForm> }) => {
  const labelId = React.useId();
  const errorId = React.useId();

  return (
    <FormField
      control={form.control}
      name="year"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel id={labelId}>curs</FormLabel>
          <div
            role="radiogroup"
            aria-labelledby={labelId}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? errorId : undefined}
            className="grid grid-cols-6 gap-1.5"
          >
            {YEARS.map((year, index) => (
              <label key={year} className="relative cursor-pointer select-none">
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
                    "flex h-11 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium text-muted-foreground tabular-nums shadow-sm transition-colors",
                    "hover:border-ring/40 hover:text-foreground",
                    "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                    "peer-focus-visible:ring-1 peer-focus-visible:ring-ring peer-focus-visible:outline-none",
                  )}
                >
                  {year}
                </span>
              </label>
            ))}
          </div>
          {fieldState.error && (
            <p
              id={errorId}
              className={cn(FIELD_HINT, "font-medium text-destructive")}
            >
              {fieldState.error.message}
            </p>
          )}
        </FormItem>
      )}
    />
  );
};

export default YearField;

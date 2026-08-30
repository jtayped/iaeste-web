import * as React from "react";
import {
  TextField as HeroUITextField,
  type TextFieldProps as HeroUITextFieldProps,
} from "@heroui/react/textfield";

import { cn } from "@repo/ui/lib/utils";

export interface TextFieldProps extends Omit<
  HeroUITextFieldProps,
  "className"
> {
  className?: string;
}

/**
 * The root of a text field: label, control, description and error message in
 * one stack.
 *
 * It is what replaces the old `FormItem` / `FormControl` / `useFormField` id
 * machinery. One `useTextField()` call inside mints the ids and hands them to
 * whichever `Label`, `Input`, `Textarea`, `FormDescription` and `FormMessage`
 * are nested below, so nothing here has to generate or thread an id, and the
 * control's `aria-describedby` follows whichever of the two messages is
 * actually on screen.
 *
 * `validationBehavior="aria"` because the Zod schemas are the only source of
 * truth for validity: React Aria may describe the field as invalid, but it
 * must never raise a browser validation bubble of its own. Required fields
 * still carry the native `required` attribute where they did before.
 *
 * The gap is HeroUI's `gap-1` widened to the 8px this repo's forms use.
 */
const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>(
  ({ className, fullWidth = true, ...props }, ref) => (
    <HeroUITextField
      ref={ref}
      fullWidth={fullWidth}
      validationBehavior="aria"
      className={cn("gap-2", className)}
      {...props}
    />
  ),
);
TextField.displayName = "TextField";

export { TextField };

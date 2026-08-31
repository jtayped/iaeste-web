import * as React from "react";
import {
  InputOTPGroup as HeroUIInputOTPGroup,
  InputOTPRoot as HeroUIInputOTPRoot,
  InputOTPSeparator as HeroUIInputOTPSeparator,
  InputOTPSlot as HeroUIInputOTPSlot,
  REGEXP_ONLY_DIGITS,
  type InputOTPProps as HeroUIInputOTPProps,
  type InputOTPGroupProps,
  type InputOTPSeparatorProps,
  type InputOTPSlotProps,
} from "@heroui/react/input-otp";

import { cn } from "@repo/ui/lib/utils";

export interface InputOTPProps extends HeroUIInputOTPProps {
  /** Native alias for HeroUI's `isDisabled`. */
  disabled?: boolean;
}

/**
 * One hidden input behind a row of slots, so paste, autofill and the
 * platform's SMS/email code suggestion all keep working — the thing that
 * breaks when a code field is built as six separate inputs.
 *
 * HeroUI's version is a skin over the same `input-otp` package this was
 * already built on, so none of that changes. What it adds is a
 * `FieldErrorContext`: pass `isInvalid` and a nested `FormMessage` shows the
 * validation message the same way a `TextField` would.
 *
 * Digits only by default: `pattern` drops non-digit keystrokes, and
 * `pasteTransformer` strips spaces and punctuation out of a pasted value
 * first — an emailed code copied as "418 502" still fills the six boxes
 * cleanly instead of putting the space in a slot and dropping a digit. Both
 * can be overridden for an alphanumeric code.
 */
const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
  (
    {
      className,
      disabled,
      isDisabled,
      pattern = REGEXP_ONLY_DIGITS,
      pasteTransformer = (pasted) => pasted.replace(/\D/g, ""),
      ...props
    },
    ref,
  ) => (
    <HeroUIInputOTPRoot
      ref={ref}
      isDisabled={isDisabled ?? disabled}
      className={className}
      pattern={pattern}
      pasteTransformer={pasteTransformer}
      {...props}
    />
  ),
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<HTMLDivElement, InputOTPGroupProps>(
  ({ className, ...props }, ref) => (
    <HeroUIInputOTPGroup ref={ref} className={className} {...props} />
  ),
);
InputOTPGroup.displayName = "InputOTPGroup";

/**
 * Kept at the 48px of the version this replaces — the code field is the only
 * control on its screen, and a six-box row is the one place worth the extra
 * height. Width stays HeroUI's `flex-1`, so the row narrows on a small phone
 * instead of overflowing.
 */
const InputOTPSlot = React.forwardRef<HTMLDivElement, InputOTPSlotProps>(
  ({ className, ...props }, ref) => (
    <HeroUIInputOTPSlot
      ref={ref}
      className={cn("h-12", className)}
      {...props}
    />
  ),
);
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<
  HTMLDivElement,
  InputOTPSeparatorProps
>(({ className, ...props }, ref) => (
  <HeroUIInputOTPSeparator
    ref={ref}
    role="separator"
    className={className}
    {...props}
  />
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };

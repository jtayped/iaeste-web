import * as React from "react";
import {
  AlertContent as HeroUIAlertContent,
  AlertDescription as HeroUIAlertDescription,
  AlertIndicator as HeroUIAlertIndicator,
  AlertRoot as HeroUIAlertRoot,
  AlertTitle as HeroUIAlertTitle,
} from "@heroui/react/alert";

type AlertVariant =
  "default" | "destructive" | "accent" | "success" | "warning";

/**
 * HeroUI calls this `status` and offers more of them than the two we had.
 * `destructive` is kept as the name for the danger state because
 * `apps/web`'s contact form and the admin already speak it.
 */
const HEROUI_STATUS = {
  default: "default",
  destructive: "danger",
  accent: "accent",
  success: "success",
  warning: "warning",
} as const satisfies Record<AlertVariant, string>;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant | null;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, children, ...props }, ref) => (
    <HeroUIAlertRoot
      ref={ref}
      role="alert"
      status={HEROUI_STATUS[variant ?? "default"]}
      className={className}
      {...props}
    >
      {children}
    </HeroUIAlertRoot>
  ),
);
Alert.displayName = "Alert";

/**
 * Wraps the leading icon. HeroUI lays the alert out as a flex row of
 * indicator + content, which replaces the absolutely-positioned `[&>svg]`
 * rules the copied component used.
 */
const AlertIndicator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <HeroUIAlertIndicator ref={ref} className={className} {...props} />
));
AlertIndicator.displayName = "AlertIndicator";

/** Stacks a title above a description beside the indicator. */
const AlertContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <HeroUIAlertContent ref={ref} className={className} {...props} />
));
AlertContent.displayName = "AlertContent";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <HeroUIAlertTitle ref={ref} className={className} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <HeroUIAlertDescription ref={ref} className={className} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertIndicator, AlertContent, AlertTitle, AlertDescription };
export type { AlertVariant };

"use client";

import * as React from "react";
import { Text } from "react-aria-components/Text";
import {
  AlertDialogBackdrop as HeroUIAlertDialogBackdrop,
  AlertDialogBody as HeroUIAlertDialogBody,
  AlertDialogContainer as HeroUIAlertDialogContainer,
  AlertDialogDialog as HeroUIAlertDialogDialog,
  AlertDialogFooter as HeroUIAlertDialogFooter,
  AlertDialogHeader as HeroUIAlertDialogHeader,
  AlertDialogHeading as HeroUIAlertDialogHeading,
  AlertDialogRoot as HeroUIAlertDialogRoot,
  type AlertDialogContainerProps as HeroUIAlertDialogContainerProps,
} from "@heroui/react/alert-dialog";

import { cn } from "@repo/ui/lib/utils";

/**
 * The confirmation dialog: `role="alertdialog"`, and — unlike a plain modal —
 * it does not close on a click outside or on escape, because the whole point
 * is that the answer is deliberate.
 *
 * ```tsx
 * <AlertDialog isOpen={open} onOpenChange={setOpen}>
 *   <Button>expulsa</Button>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <AlertDialogTitle>expulsar?</AlertDialogTitle>
 *       <AlertDialogDescription>…</AlertDialogDescription>
 *     </AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <Button slot="close" variant="outline">cancel·la</Button>
 *       <Button onClick={confirm}>expulsa</Button>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 * ```
 *
 * The trigger is whichever focusable child comes first: React Aria puts the
 * trigger props on a context that `Button` reads. A button with `slot="close"`
 * closes the dialog with no handler of its own.
 */

const AlertDialog = HeroUIAlertDialogRoot;

export interface AlertDialogContentProps extends Omit<
  HeroUIAlertDialogContainerProps,
  "children" | "className"
> {
  className?: string;
  /** A function child receives `close`, for a footer button that dismisses. */
  children?: React.ComponentProps<typeof HeroUIAlertDialogDialog>["children"];
}

/**
 * Backdrop, positioning container and dialog in one, since a caller never
 * wants fewer than all three. `className` lands on the dialog — the part with
 * a width.
 */
const AlertDialogContent = ({
  className,
  children,
  ...props
}: AlertDialogContentProps) => (
  <HeroUIAlertDialogBackdrop>
    <HeroUIAlertDialogContainer {...props}>
      <HeroUIAlertDialogDialog className={className}>
        {children}
      </HeroUIAlertDialogDialog>
    </HeroUIAlertDialogContainer>
  </HeroUIAlertDialogBackdrop>
);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = HeroUIAlertDialogHeader;

const AlertDialogTitle = HeroUIAlertDialogHeading;

/**
 * React Aria's `Text` rather than a paragraph: inside an `alertdialog` it
 * claims the description slot, which is what points the dialog's
 * `aria-describedby` at this text. A plain `<p>` would look identical and be
 * announced by nothing.
 */
const AlertDialogDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof Text>) => (
  <Text
    slot="description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);
AlertDialogDescription.displayName = "AlertDialogDescription";

/** The scrolling middle, for a dialog that asks for something as well. */
const AlertDialogBody = HeroUIAlertDialogBody;

const AlertDialogFooter = HeroUIAlertDialogFooter;

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogBody,
  AlertDialogFooter,
};

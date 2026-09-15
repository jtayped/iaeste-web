"use client";

import * as React from "react";
import {
  ModalBackdrop as HeroUIModalBackdrop,
  ModalBody as HeroUIModalBody,
  ModalCloseTrigger as HeroUIModalCloseTrigger,
  ModalContainer as HeroUIModalContainer,
  ModalDialog as HeroUIModalDialog,
  ModalFooter as HeroUIModalFooter,
  ModalHeader as HeroUIModalHeader,
  ModalHeading as HeroUIModalHeading,
  ModalRoot as HeroUIModalRoot,
  type ModalContainerProps as HeroUIModalContainerProps,
} from "@heroui/react/modal";

import { cn } from "@repo/ui/lib/utils";

/**
 * A centred modal. The plain one — for a form, or anything else that is not
 * asking "are you sure": that is `AlertDialog`, which refuses to close on a
 * click outside because the answer has to be deliberate. This one closes.
 *
 * ```tsx
 * <Dialog isOpen={open} onOpenChange={setOpen}>
 *   <Button>convida algú</Button>
 *   <DialogContent className="sm:max-w-lg">
 *     <DialogHeader>
 *       <DialogTitle>convida algú</DialogTitle>
 *       <DialogDescription>…</DialogDescription>
 *     </DialogHeader>
 *     <DialogBody>…</DialogBody>
 *     <DialogClose aria-label="tanca" />
 *   </DialogContent>
 * </Dialog>
 * ```
 *
 * As with `Drawer`, the trigger is whichever focusable child comes first —
 * React Aria passes the trigger props through context — and there is no close
 * button unless you render `DialogClose`.
 */

const Dialog = HeroUIModalRoot;

export interface DialogContentProps extends Omit<
  HeroUIModalContainerProps,
  "children" | "className"
> {
  className?: string;
  /** A function child receives `close`, for a footer button that dismisses. */
  children?: React.ComponentProps<typeof HeroUIModalDialog>["children"];
}

/**
 * Backdrop, positioning container and dialog in one. `className` lands on the
 * dialog, which is the part with a width.
 */
const DialogContent = ({
  className,
  children,
  placement = "center",
  ...props
}: DialogContentProps) => (
  <HeroUIModalBackdrop>
    <HeroUIModalContainer placement={placement} {...props}>
      <HeroUIModalDialog className={className}>{children}</HeroUIModalDialog>
    </HeroUIModalContainer>
  </HeroUIModalBackdrop>
);
DialogContent.displayName = "DialogContent";

const DialogHeader = HeroUIModalHeader;

const DialogTitle = HeroUIModalHeading;

/** Same reasoning as `DrawerDescription`: a plain paragraph inside the
    dialog, where it is read anyway, rather than React Aria's `Text`. */
const DialogDescription = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"p">) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
DialogDescription.displayName = "DialogDescription";

const DialogBody = HeroUIModalBody;

const DialogFooter = HeroUIModalFooter;

/** The corner "×". React Aria wires it to the dialog's own close. */
const DialogClose = HeroUIModalCloseTrigger;

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
};

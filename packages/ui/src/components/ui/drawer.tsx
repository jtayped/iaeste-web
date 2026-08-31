"use client";

import * as React from "react";
import {
  DrawerBackdrop as HeroUIDrawerBackdrop,
  DrawerBody as HeroUIDrawerBody,
  DrawerCloseTrigger as HeroUIDrawerCloseTrigger,
  DrawerContent as HeroUIDrawerContent,
  DrawerDialog as HeroUIDrawerDialog,
  DrawerFooter as HeroUIDrawerFooter,
  DrawerHeader as HeroUIDrawerHeader,
  DrawerHeading as HeroUIDrawerHeading,
  DrawerRoot as HeroUIDrawerRoot,
  type DrawerContentProps as HeroUIDrawerContentProps,
} from "@heroui/react/drawer";

import { cn } from "@repo/ui/lib/utils";

/**
 * A panel that slides in from an edge. This is what `Sheet` was.
 *
 * ```tsx
 * <Drawer isOpen={open} onOpenChange={setOpen}>
 *   <Button>convida algú</Button>
 *   <DrawerContent placement="right">
 *     <DrawerHeader>
 *       <DrawerTitle>convida algú</DrawerTitle>
 *       <DrawerDescription>…</DrawerDescription>
 *     </DrawerHeader>
 *     <DrawerBody>…</DrawerBody>
 *     <DrawerClose />
 *   </DrawerContent>
 * </Drawer>
 * ```
 *
 * The trigger is whichever focusable child comes first — `Button` takes the
 * trigger props from context — and there is no close button unless you render
 * `DrawerClose`, which was the reverse of the old `Sheet`: it always appended
 * one, and the mobile sidebar hid it again with `[&>button]:hidden`.
 *
 * **Scrolling content belongs in `DrawerBody`.** A dismissable drawer can be
 * dragged shut, so the dialog sets `touch-action: none`; `DrawerBody` is the
 * part that sets it back to `pan-y`, and is also excluded from the drag.
 */

const Drawer = HeroUIDrawerRoot;

export interface DrawerContentProps extends Omit<
  HeroUIDrawerContentProps,
  "children" | "className"
> {
  className?: string;
  /** Lands on the dialog with `className`, so a CSS variable set here is in
      scope for the utilities that read it. */
  style?: React.CSSProperties;
  /** A function child receives `close`, for a footer button that dismisses. */
  children?: React.ComponentProps<typeof HeroUIDrawerDialog>["children"];
}

/**
 * Backdrop, edge-anchored container and dialog in one. `className` lands on
 * the dialog, which is the part with a width.
 */
const DrawerContent = ({
  className,
  style,
  children,
  placement = "right",
  ...props
}: DrawerContentProps) => (
  <HeroUIDrawerBackdrop>
    <HeroUIDrawerContent placement={placement} {...props}>
      <HeroUIDrawerDialog className={className} style={style}>
        {children}
      </HeroUIDrawerDialog>
    </HeroUIDrawerContent>
  </HeroUIDrawerBackdrop>
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = HeroUIDrawerHeader;

const DrawerTitle = HeroUIDrawerHeading;

/**
 * A plain paragraph, not React Aria's `Text`: outside a `role="alertdialog"`
 * React Aria wires no `aria-describedby`, and the text is inside the dialog
 * where it is read anyway.
 */
const DrawerDescription = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"p">) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
DrawerDescription.displayName = "DrawerDescription";

const DrawerBody = HeroUIDrawerBody;

const DrawerFooter = HeroUIDrawerFooter;

/** The corner "×". React Aria wires it to the dialog's own close. */
const DrawerClose = HeroUIDrawerCloseTrigger;

export {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
  DrawerClose,
};

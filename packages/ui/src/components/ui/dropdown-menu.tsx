"use client";

import * as React from "react";
import { Pressable } from "react-aria-components/Pressable";
import {
  DropdownItem as HeroUIDropdownItem,
  DropdownMenu as HeroUIDropdownMenu,
  DropdownPopover as HeroUIDropdownPopover,
  DropdownRoot as HeroUIDropdownRoot,
  type DropdownItemProps as HeroUIDropdownItemProps,
  type DropdownPopoverProps as HeroUIDropdownPopoverProps,
} from "@heroui/react/dropdown";
import { Header as HeroUIHeader } from "@heroui/react/header";

import { Separator } from "@repo/ui/separator";

/**
 * React Aria's menu is a collection: `DropdownMenuContent` builds it from item,
 * header and separator nodes rather than from arbitrary markup, and each node
 * renders itself. That is what makes typeahead, arrow keys and `aria-activede-
 * scendant` work without the menu being told what its children are.
 *
 * The practical consequences for callers:
 *
 * - Items take `href` and `download` and render a real `<a>`, so the old
 *   `asChild` wrapping of a link is gone. Client navigation needs
 *   `@repo/ui/router-provider` above; a `download` link is left to the browser.
 * - Selecting an item closes the menu. An item that starts async work and wants
 *   to stay open while it runs says `shouldCloseOnSelect={false}` — the old
 *   `onSelect` + `preventDefault` pair.
 */

const DropdownMenu = HeroUIDropdownRoot;

/**
 * Only needed when the trigger is not already a React Aria control — the same
 * rule as `TooltipTrigger`. `Button` picks the trigger props up from context on
 * its own; a plain `<button>` like the sidebar's menu button does not, and gets
 * them cloned onto it here.
 */
const DropdownMenuTrigger = Pressable;

export interface DropdownMenuContentProps extends HeroUIDropdownPopoverProps {
  /** Sits on the popover, since that is what has a width to constrain. */
  className?: string;
}

/**
 * React Aria splits the surface in two — a popover that positions itself
 * against the trigger, and the menu inside it. Nothing wants one without the
 * other, so this is both, and `className` goes to the popover.
 *
 * The popover carries a `--trigger-width` custom property, measured from the
 * trigger, for menus that want to match its width.
 */
const DropdownMenuContent = ({
  className,
  children,
  ...props
}: DropdownMenuContentProps) => (
  <HeroUIDropdownPopover className={className} {...props}>
    <HeroUIDropdownMenu>{children}</HeroUIDropdownMenu>
  </HeroUIDropdownPopover>
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps extends HeroUIDropdownItemProps {
  /** Native alias for React Aria's `isDisabled`. */
  disabled?: boolean;
}

const DropdownMenuItem = ({
  disabled,
  isDisabled,
  ...props
}: DropdownMenuItemProps) => (
  <HeroUIDropdownItem isDisabled={isDisabled ?? disabled} {...props} />
);
DropdownMenuItem.displayName = "DropdownMenuItem";

/** A heading row inside the menu, not an item: it takes no focus and no key. */
const DropdownMenuLabel = HeroUIHeader;

const DropdownMenuSeparator = Separator;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};

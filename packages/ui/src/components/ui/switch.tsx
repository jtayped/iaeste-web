"use client";

import * as React from "react";
import {
  SwitchContent as HeroUISwitchContent,
  SwitchControl as HeroUISwitchControl,
  SwitchIcon as HeroUISwitchIcon,
  SwitchRoot as HeroUISwitchRoot,
  SwitchThumb as HeroUISwitchThumb,
} from "@heroui/react/switch";

/**
 * Zero consumers exist for this component, so it exposes HeroUI's native
 * `isSelected` / `onChange` / `isDisabled` API directly rather than a
 * Radix-shaped `checked` / `onCheckedChange` compatibility layer.
 *
 * `Switch` only sets up context — it renders nothing on its own, so a
 * labelled control has to compose the sub-parts itself, e.g.:
 *
 * ```tsx
 * <Switch isSelected={on} onChange={setOn}>
 *   <SwitchContent>
 *     <SwitchControl>
 *       <SwitchThumb />
 *     </SwitchControl>
 *     Label text
 *   </SwitchContent>
 * </Switch>
 * ```
 */
const Switch = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof HeroUISwitchRoot>
>(({ className, ...props }, ref) => (
  <HeroUISwitchRoot ref={ref} className={className} {...props} />
));
Switch.displayName = "Switch";

const SwitchContent = React.forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<typeof HeroUISwitchContent>
>(({ className, ...props }, ref) => (
  <HeroUISwitchContent ref={ref} className={className} {...props} />
));
SwitchContent.displayName = "SwitchContent";

const SwitchControl = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof HeroUISwitchControl>
>(({ className, ...props }, ref) => (
  <HeroUISwitchControl ref={ref} className={className} {...props} />
));
SwitchControl.displayName = "SwitchControl";

const SwitchThumb = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof HeroUISwitchThumb>
>(({ className, ...props }, ref) => (
  <HeroUISwitchThumb ref={ref} className={className} {...props} />
));
SwitchThumb.displayName = "SwitchThumb";

const SwitchIcon = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof HeroUISwitchIcon>
>(({ className, ...props }, ref) => (
  <HeroUISwitchIcon ref={ref} className={className} {...props} />
));
SwitchIcon.displayName = "SwitchIcon";

export { Switch, SwitchContent, SwitchControl, SwitchThumb, SwitchIcon };

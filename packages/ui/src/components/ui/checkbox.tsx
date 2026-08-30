"use client";

import * as React from "react";
import {
  CheckboxContent as HeroUICheckboxContent,
  CheckboxControl as HeroUICheckboxControl,
  CheckboxIndicator as HeroUICheckboxIndicator,
  CheckboxRoot as HeroUICheckboxRoot,
} from "@heroui/react/checkbox";

/**
 * Zero consumers exist for this component, so it exposes HeroUI's native
 * `isSelected` / `onChange` / `isDisabled` / `isIndeterminate` API directly
 * rather than a Radix-shaped `checked` / `onCheckedChange` compatibility
 * layer.
 *
 * `Checkbox` only sets up context — it renders nothing on its own, so a
 * labelled control has to compose the sub-parts itself, e.g.:
 *
 * ```tsx
 * <Checkbox isSelected={checked} onChange={setChecked}>
 *   <CheckboxContent>
 *     <CheckboxControl>
 *       <CheckboxIndicator />
 *     </CheckboxControl>
 *     Label text
 *   </CheckboxContent>
 * </Checkbox>
 * ```
 */
const Checkbox = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof HeroUICheckboxRoot>
>(({ className, ...props }, ref) => (
  <HeroUICheckboxRoot ref={ref} className={className} {...props} />
));
Checkbox.displayName = "Checkbox";

const CheckboxContent = React.forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<typeof HeroUICheckboxContent>
>(({ className, ...props }, ref) => (
  <HeroUICheckboxContent ref={ref} className={className} {...props} />
));
CheckboxContent.displayName = "CheckboxContent";

const CheckboxControl = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof HeroUICheckboxControl>
>(({ className, ...props }, ref) => (
  <HeroUICheckboxControl ref={ref} className={className} {...props} />
));
CheckboxControl.displayName = "CheckboxControl";

const CheckboxIndicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof HeroUICheckboxIndicator>
>(({ className, ...props }, ref) => (
  <HeroUICheckboxIndicator ref={ref} className={className} {...props} />
));
CheckboxIndicator.displayName = "CheckboxIndicator";

export { Checkbox, CheckboxContent, CheckboxControl, CheckboxIndicator };

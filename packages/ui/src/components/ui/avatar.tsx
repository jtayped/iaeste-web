"use client";

import * as React from "react";
import {
  AvatarFallback as HeroUIAvatarFallback,
  AvatarImage as HeroUIAvatarImage,
  AvatarRoot as HeroUIAvatarRoot,
} from "@heroui/react/avatar";

/**
 * HeroUI's `md` size is `size-10` (40px) — the same default this component
 * has always used — so no explicit `size` prop is needed to match. Its base
 * shape is `rounded-3xl` rather than `rounded-full`; the sole consumer
 * (`nav-user.tsx`) already overrides the radius with its own `rounded-md`
 * class, and utility classes win over HeroUI's component-layer styles, so
 * that override still applies unchanged.
 */
const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof HeroUIAvatarRoot>
>(({ className, ...props }, ref) => (
  <HeroUIAvatarRoot ref={ref} className={className} {...props} />
));
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ComponentPropsWithoutRef<typeof HeroUIAvatarImage>
>(({ className, ...props }, ref) => (
  <HeroUIAvatarImage ref={ref} className={className} {...props} />
));
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof HeroUIAvatarFallback>
>(({ className, ...props }, ref) => (
  <HeroUIAvatarFallback ref={ref} className={className} {...props} />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };

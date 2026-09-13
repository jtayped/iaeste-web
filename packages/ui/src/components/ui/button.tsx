import * as React from "react";
import {
  Button as HeroUIButton,
  buttonVariants as heroUIButtonVariants,
} from "@heroui/react/button";

import { cn } from "@repo/ui/lib/utils";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "onDark";

type ButtonSize = "default" | "sm" | "lg" | "xl" | "icon";

/**
 * HeroUI ships `primary | secondary | tertiary | outline | ghost | danger |
 * danger-soft`. Two of ours have no counterpart there:
 *
 * - our `secondary` is IAESTE blue, while HeroUI's `secondary` is a neutral
 *   grey fill, so mapping the two by name would quietly drain the brand colour
 *   out of every secondary button;
 * - HeroUI has no link-shaped button variant at all.
 *
 * `onDark` is the third: the white plate the site puts on its navy bands,
 * where `default` would be the same navy as the ground behind it.
 *
 * All three ride on `ghost` — the only variant that adds neither a fill nor a
 * border — and are then repainted by `.button--brand` / `.button--link` /
 * `.button--on-dark` in `globals.css`, which set the same `--button-*` custom
 * properties HeroUI's own variants use.
 */
const HEROUI_VARIANT = {
  default: "primary",
  destructive: "danger",
  outline: "outline",
  secondary: "ghost",
  ghost: "ghost",
  link: "ghost",
  onDark: "ghost",
} as const satisfies Record<ButtonVariant, string>;

const BRAND_VARIANT_CLASS = {
  secondary: "button--brand",
  link: "button--link",
  onDark: "button--on-dark",
} as const satisfies Partial<Record<ButtonVariant, string>>;

/**
 * `icon` is a size here but an `isIconOnly` modifier in HeroUI.
 *
 * `xl` has no HeroUI counterpart. HeroUI's scale *shrinks* on desktop — its
 * base is `h-10 md:h-9` and even `lg` is only `h-11 md:h-10` — which is right
 * for dense app UI and wrong for a marketing call to action. The public site's
 * hero and band CTAs grow instead, so `xl` rides on `lg` and is resized by
 * `.button--xl` in `globals.css`.
 */
const HEROUI_SIZE = {
  default: "md",
  sm: "sm",
  lg: "lg",
  xl: "lg",
  icon: "md",
} as const satisfies Record<ButtonSize, string>;

const SIZE_CLASS = {
  xl: "button--xl",
} as const satisfies Partial<Record<ButtonSize, string>>;

interface ButtonVariantOptions {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  className?: string;
}

/**
 * Button classes without a button element, for the cases where the thing being
 * styled has to stay something else — most often a `next/link` or a localised
 * `Link` from an app's `i18n/routing`. HeroUI's button is a real `<button>`
 * with no polymorphic escape hatch, so anchors get the classes instead of
 * being wrapped.
 */
function buttonVariants({
  variant,
  size,
  className,
}: ButtonVariantOptions = {}) {
  const resolvedVariant = variant ?? "default";
  const resolvedSize = size ?? "default";

  return cn(
    heroUIButtonVariants({
      variant: HEROUI_VARIANT[resolvedVariant],
      size: HEROUI_SIZE[resolvedSize],
      isIconOnly: resolvedSize === "icon",
    }),
    BRAND_VARIANT_CLASS[resolvedVariant as keyof typeof BRAND_VARIANT_CLASS],
    SIZE_CLASS[resolvedSize as keyof typeof SIZE_CLASS],
    className,
  );
}

export interface ButtonProps extends Omit<
  React.ComponentPropsWithoutRef<typeof HeroUIButton>,
  "variant" | "size" | "className" | "children"
> {
  children?: React.ReactNode;
  className?: string;
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  /** Native alias for HeroUI's `isDisabled`. */
  disabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, disabled, isDisabled, ...props }, ref) => {
    const resolvedVariant = variant ?? "default";
    const resolvedSize = size ?? "default";

    return (
      <HeroUIButton
        ref={ref}
        variant={HEROUI_VARIANT[resolvedVariant]}
        size={HEROUI_SIZE[resolvedSize]}
        isIconOnly={resolvedSize === "icon"}
        isDisabled={isDisabled ?? disabled}
        className={cn(
          BRAND_VARIANT_CLASS[
            resolvedVariant as keyof typeof BRAND_VARIANT_CLASS
          ],
          SIZE_CLASS[resolvedSize as keyof typeof SIZE_CLASS],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonVariant, ButtonSize };

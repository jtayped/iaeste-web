import * as React from "react";
import { ChipRoot as HeroUIChip } from "@heroui/react/chip";

import { cn } from "@repo/ui/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Backed by HeroUI's `Chip`, not its `Badge`. HeroUI's `Badge` is a
 * notification dot — it carries a `placement` and is meant to be anchored to
 * another element. Ours is a status label, which is what `Chip` is.
 *
 * `apps/admin/src/lib/labels.ts` mirrors these four names in its `Tone` type,
 * so they have to stay exactly as they are.
 */
const HEROUI_CHIP = {
  default: { variant: "primary", color: "accent" },
  destructive: { variant: "primary", color: "danger" },
  // IAESTE blue and the outlined badge have no HeroUI colour. They ride on a
  // neutral combination and are repainted by `.chip--brand` / `.chip--outline`
  // in globals.css, which set the same `--chip-*` properties HeroUI uses.
  secondary: { variant: "primary", color: "default" },
  outline: { variant: "tertiary", color: "default" },
} as const satisfies Record<BadgeVariant, { variant: string; color: string }>;

const BRAND_VARIANT_CLASS = {
  secondary: "chip--brand",
  outline: "chip--outline",
} as const satisfies Partial<Record<BadgeVariant, string>>;

interface BadgeVariantOptions {
  variant?: BadgeVariant | null;
  className?: string;
}

/** Badge classes without a badge element, for styling a non-span as a badge. */
function badgeVariants({ variant, className }: BadgeVariantOptions = {}) {
  const resolved = variant ?? "default";
  const { variant: chipVariant, color } = HEROUI_CHIP[resolved];

  return cn(
    "chip",
    `chip--${chipVariant}`,
    `chip--${color}`,
    "chip--md",
    BRAND_VARIANT_CLASS[resolved as keyof typeof BRAND_VARIANT_CLASS],
    className,
  );
}

export interface BadgeProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "color"
> {
  variant?: BadgeVariant | null;
}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const resolved = variant ?? "default";
  const { variant: chipVariant, color } = HEROUI_CHIP[resolved];

  return (
    <HeroUIChip
      variant={chipVariant}
      color={color}
      className={cn(
        BRAND_VARIANT_CLASS[resolved as keyof typeof BRAND_VARIANT_CLASS],
        className,
      )}
      {...props}
    >
      {children}
    </HeroUIChip>
  );
}

export { Badge, badgeVariants };
export type { BadgeVariant };

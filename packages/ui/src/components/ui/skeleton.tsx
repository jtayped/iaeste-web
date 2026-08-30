import * as React from "react";
import { Skeleton as HeroUISkeleton } from "@heroui/react/skeleton";

import { cn } from "@repo/ui/lib/utils";

type SkeletonProps = React.ComponentPropsWithoutRef<typeof HeroUISkeleton>;

/**
 * HeroUI's default `animationType` is `"shimmer"`; every caller here expects
 * the plain `animate-pulse` sweep this component always had, so `"pulse"` is
 * the default instead. Pass `animationType` explicitly to opt into shimmer
 * (or `"none"`).
 */
function Skeleton({
  className,
  animationType = "pulse",
  ...props
}: SkeletonProps) {
  return (
    <HeroUISkeleton
      animationType={animationType}
      className={cn("rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };

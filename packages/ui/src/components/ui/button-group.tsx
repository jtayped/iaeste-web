import { cn } from "@repo/ui/lib/utils";
import React from "react";

/**
 * Retained rather than migrated to HeroUI.
 *
 * HeroUI's `ButtonGroup` is a segmented control: it sets `gap-0` and strips the
 * inner radii so the buttons read as one joined control. This one is a spacing
 * helper — a row of separate buttons with a gap between them. Swapping it would
 * fuse buttons that are meant to stay distinct, which is a redesign rather than
 * a component migration.
 */
const ButtonGroup = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>{children}</div>
  );
};

export default ButtonGroup;

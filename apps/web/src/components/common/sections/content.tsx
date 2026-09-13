import { cn } from "@repo/ui/lib/utils";
import React from "react";

/**
 * The vertical rhythm between sections, owned in one place.
 *
 * The home page used to override this to `py-10` while every other page took
 * the default, so the first section sat 40px below the hero on one page and
 * 80px below an identical hero on the next.
 */
const Content = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("grid gap-20 bg-background py-20", className)}>
      {children}
    </div>
  );
};

export default Content;

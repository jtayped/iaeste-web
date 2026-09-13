import { cn } from "@repo/ui/lib/utils";
import React from "react";
import Section from "./section";

/**
 * The navy full-bleed band the site reserves for the things it actually wants
 * read. There were five of these, each with its own vertical padding — 16/24,
 * 14/16, a flat 16 under a gradient, 40/48 at the top of the blog — and one of
 * them added a decorative blur orb that appears nowhere else. One value now.
 */
const Band = ({
  children,
  className = "",
  innerClassName = "",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
} & React.HTMLAttributes<HTMLElement>) => {
  return (
    <Section
      className={cn(
        "bg-primary py-16 text-primary-foreground md:py-24",
        className,
      )}
      innerClassName={innerClassName}
      {...props}
    >
      {children}
    </Section>
  );
};

export default Band;

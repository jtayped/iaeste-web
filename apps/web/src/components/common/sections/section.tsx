import { cn } from "@repo/ui/lib/utils";
import React from "react";

/**
 * One horizontal contract for the whole site.
 *
 * The outer `<section>` is full-bleed so a band can paint its background edge
 * to edge; the inner wrapper carries the measure. Before this, the marketing
 * sections had no max width at all and ran the full 1312px of a 1440px screen
 * while the blog stopped at 1280px — so the header logo and the content under
 * it did not line up when you navigated between them.
 *
 * `className` styles the band (background, vertical padding); `innerClassName`
 * styles the content column (grid, gap).
 */
const Section = ({
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
    <section className={cn("section-padding", className)} {...props}>
      <div className={cn("mx-auto w-full max-w-7xl", innerClassName)}>
        {children}
      </div>
    </section>
  );
};

export default Section;

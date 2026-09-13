import { cn } from "@repo/ui/lib/utils";
import React from "react";
import Section from "./section";

/**
 * The site's two-column section: an argument on one side, the evidence for it
 * on the other. The grid lives on the content column rather than the band, so
 * a `DivideSection` with a background still paints edge to edge.
 */
const DivideSection = ({
  children,
  className = "",
  innerClassName = "",
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) => {
  return (
    <Section
      className={className}
      innerClassName={cn("grid gap-10 md:grid-cols-2", innerClassName)}
    >
      {children}
    </Section>
  );
};

export default DivideSection;

import { cn } from "@repo/ui/lib/utils";
import React from "react";

const Section = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <section className={cn("section-padding", className)}>{children}</section>
  );
};

export default Section;

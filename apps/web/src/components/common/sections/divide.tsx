import { cn } from "@repo/ui/lib/utils";
import React from "react";
import Section from "./section";

const DivideSection = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Section className={cn("grid gap-10 md:grid-cols-2", className)}>
      {children}
    </Section>
  );
};

export default DivideSection;

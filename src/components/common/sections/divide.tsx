import { cn } from "@/lib/utils";
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
    <Section className={cn("grid md:grid-cols-2 gap-10", className)}>
      {children}
    </Section>
  );
};

export default DivideSection;

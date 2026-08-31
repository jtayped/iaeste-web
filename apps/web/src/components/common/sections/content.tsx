import { cn } from "@repo/ui/lib/utils";
import React from "react";

const Content = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("grid gap-20 bg-background pt-20 pb-10", className)}>
      {children}
    </div>
  );
};

export default Content;

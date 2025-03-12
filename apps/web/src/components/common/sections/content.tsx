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
    <div className={cn("bg-background pb-10 pt-20 grid gap-20", className)}>
      {children}
    </div>
  );
};

export default Content;

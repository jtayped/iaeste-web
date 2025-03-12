import { cn } from "@repo/ui/lib/utils";
import React from "react";

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

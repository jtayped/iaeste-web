import { cn } from "@/lib/utils";
import React from "react";

const AcceptInvitation = ({
  className,
  id,
}: {
  className: string;
  id: string;
}) => {
  console.log(id);
  return <div className={cn("", className)}>AcceptInvitation</div>;
};

export default AcceptInvitation;

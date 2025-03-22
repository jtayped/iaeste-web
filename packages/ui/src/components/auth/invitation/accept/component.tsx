import { cn } from "@/lib/utils";
import React from "react";

const AcceptInvitationComponent = ({
  className,
  id,
}: {
  className: string;
  id: string;
}) => {
  console.log(id);
  return <div className={cn("", className)}>AcceptInvitationComponent</div>;
};

export default AcceptInvitationComponent;

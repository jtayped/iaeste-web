"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "./button";

const BackButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    const router = useRouter();

    const handleClick = () => {
      router.back();
    };

    return (
      <Button ref={ref} onClick={handleClick} {...props}>
        {children}
      </Button>
    );
  }
);

BackButton.displayName = "BackButton";

export default BackButton;
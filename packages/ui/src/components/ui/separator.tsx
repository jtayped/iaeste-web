"use client";

import * as React from "react";
import { Separator as HeroUISeparator } from "@heroui/react/separator";

const Separator = React.forwardRef<
  React.ElementRef<typeof HeroUISeparator>,
  React.ComponentPropsWithoutRef<typeof HeroUISeparator>
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <HeroUISeparator
    ref={ref}
    orientation={orientation}
    className={className}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };

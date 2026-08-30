import * as React from "react";
import {
  CardContent as HeroUICardContent,
  CardDescription as HeroUICardDescription,
  CardFooter as HeroUICardFooter,
  CardHeader as HeroUICardHeader,
  CardRoot as HeroUICardRoot,
  CardTitle as HeroUICardTitle,
} from "@heroui/react/card";

import { cn } from "@repo/ui/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Draws the IAESTE bar down the leading edge. Product-specific, so it has no
   * HeroUI counterpart and is kept here. It relies on the `overflow-hidden`
   * that `globals.css` restores on `.card` to clip against the corner radius.
   */
  accent?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, accent = false, ...props }, ref) => (
    <HeroUICardRoot ref={ref} className={className} {...props}>
      {accent && (
        <div className="absolute left-0 h-full w-2 rounded-tr-sm bg-primary" />
      )}
      {children}
    </HeroUICardRoot>
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <HeroUICardHeader ref={ref} className={className} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <HeroUICardTitle ref={ref} className={className} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <HeroUICardDescription ref={ref} className={className} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <HeroUICardContent ref={ref} className={cn("pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <HeroUICardFooter ref={ref} className={className} {...props} />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};

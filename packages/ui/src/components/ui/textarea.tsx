import * as React from "react";
import {
  TextArea as HeroUITextArea,
  type TextAreaProps as HeroUITextAreaProps,
} from "@heroui/react/textarea";

import { cn } from "@repo/ui/lib/utils";

export interface TextareaProps extends Omit<HeroUITextAreaProps, "className"> {
  className?: string;
}

/**
 * The `Input` story with a `<textarea>`: wired by the surrounding field root,
 * an ordinary controlled textarea without one.
 *
 * HeroUI's own floor is 38px — one line — so the previous three-line floor is
 * kept here rather than left to each caller.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, fullWidth = true, ...props }, ref) => (
    <HeroUITextArea
      ref={ref}
      fullWidth={fullWidth}
      className={cn("min-h-[60px]", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };

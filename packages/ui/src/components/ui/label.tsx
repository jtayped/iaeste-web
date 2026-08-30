import * as React from "react";
import {
  Label as HeroUILabel,
  type LabelProps as HeroUILabelProps,
} from "@heroui/react/label";

export interface LabelProps extends Omit<HeroUILabelProps, "className"> {
  className?: string;
}

/**
 * Inside a field root the label needs no `htmlFor`: React Aria hands it the
 * control's id through context, and turns it red on its own when the field is
 * invalid. Outside one — the admin, which labels its controls by hand — it is
 * a plain `<label>` and still takes `htmlFor`.
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <HeroUILabel ref={ref} className={className} {...props} />
  ),
);
Label.displayName = "Label";

export { Label };

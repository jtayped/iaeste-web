import * as React from "react";
import {
  Input as HeroUIInput,
  type InputProps as HeroUIInputProps,
} from "@heroui/react/input";

export interface InputProps extends Omit<HeroUIInputProps, "className"> {
  className?: string;
}

/**
 * A bare `<input>`. React Aria only wires it up when it sits inside a field
 * root (`TextField`, `ComboBox`, …), where it picks up its `id`, its
 * `aria-describedby` and its value from context. Standalone — which is how the
 * admin uses it, having no React Hook Form — it stays an ordinary controlled
 * input taking `value` and a DOM `onChange`.
 *
 * `fullWidth` defaults on because every input in this repo fills its column.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, fullWidth = true, ...props }, ref) => (
    <HeroUIInput
      ref={ref}
      fullWidth={fullWidth}
      className={className}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };

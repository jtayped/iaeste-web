"use client";

import * as React from "react";
import {
  Description as HeroUIDescription,
  type DescriptionProps,
} from "@heroui/react/description";
import { FieldError, type FieldErrorProps } from "@heroui/react/field-error";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerFieldState,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@repo/ui/lib/utils";
import { Label, type LabelProps } from "@repo/ui/label";

/**
 * React Hook Form's provider — deliberately *not* HeroUI's `Form`, which
 * renders an HTML `<form>`. The two would nest a form inside a form.
 */
const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

/** The surrounding field's name and React Hook Form validation state. */
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext.name) {
    throw new Error("useFormField should be used within <FormField>");
  }

  return {
    name: fieldContext.name,
    ...getFieldState(fieldContext.name, formState),
  };
};

/**
 * The one place a React Hook Form field is translated into HeroUI's field
 * contract. Spread it onto the field root — `TextField`, `ComboBox`,
 * `InputOTP` — not onto the control:
 *
 * ```tsx
 * <TextField {...fieldProps(field, fieldState)}>
 *   <FormLabel>nom</FormLabel>
 *   <Input ref={field.ref} />
 *   <FormMessage />
 * </TextField>
 * ```
 *
 * `field.ref` is left out on purpose. It has to land on the control itself,
 * because it is what React Hook Form focuses when a submit fails. And `value`
 * is coerced, because React Hook Form leaves an untouched field `undefined`
 * while React Aria reads that as "uncontrolled" and stops tracking it.
 */
function fieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  field: ControllerRenderProps<TFieldValues, TName>,
  fieldState: ControllerFieldState,
) {
  return {
    name: field.name,
    value: (field.value ?? "") as string,
    onChange: field.onChange,
    onBlur: field.onBlur,
    isInvalid: Boolean(fieldState.error),
  };
}

/**
 * A field that has no HeroUI root of its own — the year picker's radio group,
 * for instance — still needs the label/control/message stack. Purely layout:
 * anything inside it labels and describes itself.
 */
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
));
FormItem.displayName = "FormItem";

/**
 * The field's label. Inside a field root it needs no `htmlFor` — it is handed
 * the control's id, and turns red on its own when the field is invalid.
 */
const FormLabel = React.forwardRef<HTMLLabelElement, LabelProps>(
  (props, ref) => <Label ref={ref} {...props} />,
);
FormLabel.displayName = "FormLabel";

/**
 * Help text. HeroUI hides it while the field is invalid, so help and error
 * never stack up on top of each other, and renders nothing at all outside a
 * field root — where there would be no control to describe.
 */
const FormDescription = React.forwardRef<HTMLElement, DescriptionProps>(
  (props, ref) => <HeroUIDescription ref={ref} {...props} />,
);
FormDescription.displayName = "FormDescription";

/**
 * The validation message. Renders the field's own error unless given other
 * children, and only while the surrounding field root is invalid — which is
 * the same `isInvalid` that `fieldProps` derives from React Hook Form, so the
 * message appears exactly once and exactly when the field is in error.
 */
const FormMessage = React.forwardRef<HTMLElement, FieldErrorProps>(
  ({ children, ...props }, ref) => {
    const { error } = useFormField();
    const body = children ?? error?.message;

    if (!body) return null;

    return (
      <FieldError ref={ref} {...props}>
        {body}
      </FieldError>
    );
  },
);
FormMessage.displayName = "FormMessage";

export {
  fieldProps,
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
  FormField,
};

import {
  fieldProps,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import { TextField } from "@repo/ui/text-field";
import { cn } from "@repo/ui/lib/utils";
import { useTranslations } from "next-intl";
import React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ContactForm } from "@repo/constants/validators/contact-form";

type Props = {
  form: UseFormReturn<ContactForm>;
  name: keyof ContactForm;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  /** Renders a `Textarea` instead of an `Input`. */
  multiline?: boolean;
  /** Upper bound from `CONTACT_FORM_LIMITS`; shows a live character count. */
  max?: number;
  className?: string;
};

/**
 * One field of the contact form. Every field reads its own copy from the
 * `contact.<name>` namespace, so the form only has to declare which input it
 * needs rather than repeat the same twenty lines five times.
 */
const ContactField = ({
  form,
  name,
  type,
  autoComplete,
  multiline = false,
  max,
  className = "",
}: Props) => {
  const t = useTranslations(`contact.${name}`);

  // Only `email` and `subject` carry help text; the rest are empty strings in
  // the message catalogue and must not leave a gap behind.
  const description = t("description");

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const count = field.value?.length ?? 0;

        // Both go under the control, and the counter has to sit beside them
        // rather than under them — but only the counted field has a counter,
        // and a row wrapped around nothing still costs a gap.
        const help = (
          <>
            {description && (
              <FormDescription className="text-xs">
                {description}
              </FormDescription>
            )}
            <FormMessage className="text-xs" />
          </>
        );

        return (
          <TextField
            {...fieldProps(field, fieldState)}
            className={cn("gap-1.5", className)}
          >
            {/* Quiet until it has something to say. HeroUI turns the label red
                on its own once the field is invalid, but only if nothing here
                overrides the colour. */}
            <FormLabel
              className={fieldState.error ? undefined : "text-muted-foreground"}
            >
              {t("label")}
            </FormLabel>
            {multiline ? (
              <Textarea
                ref={field.ref}
                placeholder={t("placeholder")}
                className="min-h-32 resize-y px-3.5 py-2.5"
              />
            ) : (
              <Input
                ref={field.ref}
                type={type}
                placeholder={t("placeholder")}
                autoComplete={autoComplete}
                className="h-11 px-3.5"
              />
            )}
            {max ? (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">{help}</div>
                {count > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "shrink-0 pt-px text-xs text-muted-foreground tabular-nums",
                      count > max && "text-destructive",
                    )}
                  >
                    {count}/{max}
                  </span>
                )}
              </div>
            ) : (
              help
            )}
          </TextField>
        );
      }}
    />
  );
};

export default ContactField;

"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { History, Loader2, Mail } from "lucide-react";

import { Button } from "@repo/ui/button";
import {
  fieldProps,
  Form,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { TextField } from "@repo/ui/text-field";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_CONTROL, FIELD_HINT } from "@/components/form/field-styles";
import { childVariants } from "@/components/form/motion";
import { ExternalMemberNotice, Section } from "@/components/form/notices";
import {
  emailStepFormSchema,
  emailStepSchema,
  type EmailStep,
  type EmailStepValues,
} from "@/lib/form-schema";

/**
 * The database distinguishes university and personal addresses. The form does
 * not need to. The shared domain helper classifies this one value after it has
 * been validated and normalised.
 */
export const EmailStepForm = ({
  defaults,
  submitting,
  error,
  onSubmit,
}: {
  defaults: EmailStepValues;
  submitting: boolean;
  error?: string;
  onSubmit: (values: EmailStep) => void;
}) => {
  const form = useForm<EmailStepValues>({
    resolver: zodResolver(emailStepFormSchema),
    defaultValues: defaults,
  });

  const submit = (values: EmailStepValues) => {
    const parsed = emailStepSchema.safeParse(values);
    if (parsed.success) onSubmit(parsed.data);
  };

  return (
    <Form {...form}>
      <form
        noValidate
        aria-busy={submitting}
        onSubmit={form.handleSubmit(submit)}
      >
        <motion.div
          variants={childVariants}
          className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <Section title="el teu correu" icon={Mail} className="sm:grid-cols-1">
            <div className="flex gap-3 rounded-lg bg-primary/8 p-4 text-primary">
              <History aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm leading-relaxed">
                ja havies estat membre? fes servir el mateix correu de
                l&apos;última campanya. si el reconeixem, recuperarem les teves
                dades.
              </p>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <TextField {...fieldProps(field, fieldState)}>
                  <FormLabel>correu electrònic</FormLabel>
                  <Input
                    {...field}
                    ref={field.ref}
                    placeholder="nom@alumnes.udl.cat"
                    data-field-name="email"
                    className={FIELD_CONTROL}
                    autoFocus
                    required
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                  />
                  <FormDescription className={FIELD_HINT}>
                    pot ser @udl.cat, @alumnes.udl.cat o una adreça personal.
                  </FormDescription>
                  <FormMessage className={cn(FIELD_HINT, "font-medium")} />
                </TextField>
              )}
            />

            {error ? (
              <p
                role="alert"
                className={cn(FIELD_HINT, "font-medium text-destructive")}
              >
                {error}
              </p>
            ) : null}
          </Section>

          <div className="bg-default/60 p-6 sm:p-8">
            <motion.div whileTap={{ scale: 0.99 }}>
              <Button
                className="h-11 w-full text-sm"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" />
                    enviant el codi…
                  </>
                ) : (
                  "envia'm el codi"
                )}
              </Button>
            </motion.div>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              el necessitaràs al pas següent per confirmar l&apos;adreça.
            </p>
          </div>
        </motion.div>

        <ExternalMemberNotice />
      </form>
    </Form>
  );
};

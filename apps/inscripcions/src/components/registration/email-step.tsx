"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { AtSign, Loader2 } from "lucide-react";

import { Button } from "@repo/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/lib/utils";

import {
  FIELD_CONTROL,
  FIELD_HINT,
  FIELD_LABEL,
} from "@/components/form/field-styles";
import { childVariants } from "@/components/form/motion";
import { ExternalMemberNotice, Section } from "@/components/form/notices";
import { emailStepSchema, type EmailStep } from "@/lib/form-schema";

/**
 * Step one, and the whole of it.
 *
 * One field on its own screen is not padding: it is what lets the address be
 * proven before anything else is collected, which is in turn what lets the
 * next screen safely show someone their own history. Asking for a name first
 * would mean either collecting data we cannot yet attribute, or showing the
 * history to whoever typed the address.
 */
export const EmailStepForm = ({
  defaultEmail,
  submitting,
  error,
  onSubmit,
}: {
  defaultEmail: string;
  submitting: boolean;
  error?: string;
  onSubmit: (values: EmailStep) => void;
}) => {
  const form = useForm<EmailStep>({
    resolver: zodResolver(emailStepSchema),
    defaultValues: { email: defaultEmail },
  });

  return (
    <Form {...form}>
      <form
        noValidate
        aria-busy={submitting}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <motion.div
          variants={childVariants}
          className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <Section
            title="quin és el teu correu?"
            icon={AtSign}
            className="sm:grid-cols-1"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className={FIELD_LABEL}>
                    correu electrònic
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="johndoe@alumnes.udl.cat"
                      data-field-name="email"
                      className={FIELD_CONTROL}
                      required
                      autoFocus
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className={FIELD_HINT}>
                    t&apos;hi enviarem un codi de sis xifres. millor el de la
                    udl, si en tens.
                  </FormDescription>
                  <FormMessage className={cn(FIELD_HINT, "font-medium")} />
                </FormItem>
              )}
            />

            {error && (
              <p
                role="alert"
                className={cn(FIELD_HINT, "font-medium text-destructive")}
              >
                {error}
              </p>
            )}
          </Section>

          <div className="bg-muted/60 p-6 sm:p-8">
            <motion.div whileTap={{ scale: 0.99 }}>
              <Button
                className="h-11 w-full text-sm"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    enviant el codi…
                  </>
                ) : (
                  "envia'm el codi"
                )}
              </Button>
            </motion.div>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              comprovem que l&apos;adreça és teva abans de demanar-te res més.
            </p>
          </div>
        </motion.div>

        <ExternalMemberNotice />
      </form>
    </Form>
  );
};

"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Pencil } from "lucide-react";

import { Button } from "@repo/ui/button";
import { fieldProps, Form, FormField } from "@repo/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@repo/ui/input-otp";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_HINT } from "@/components/form/field-styles";
import { childVariants } from "@/components/form/motion";
import { Section } from "@/components/form/notices";
import { codeStepSchema, type CodeStep } from "@/lib/form-schema";

/**
 * Step two: six digits from the inbox.
 *
 * Submits itself the moment the sixth digit lands. Nobody types a code and
 * then looks around for a button — and because a wrong code is recoverable
 * (the field clears and they try again), there is nothing here worth making
 * someone confirm. The button stays for anyone who tabs to it, and for the
 * case where an auto-submit was interrupted.
 */
export const CodeStepForm = ({
  email,
  submitting,
  error,
  resendIn,
  resending,
  onSubmit,
  onResend,
  onChangeEmail,
}: {
  email: string;
  submitting: boolean;
  error?: string;
  /** Seconds left on the cooldown; 0 means "send it again" is offered. */
  resendIn: number;
  resending: boolean;
  onSubmit: (values: CodeStep) => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) => {
  const form = useForm<CodeStep>({
    resolver: zodResolver(codeStepSchema),
    defaultValues: { code: "" },
  });

  const code = useWatch({ control: form.control, name: "code" });

  // A rejected code has to leave the field, or the auto-submit below fires
  // again immediately with the same six digits.
  React.useEffect(() => {
    if (error) form.setValue("code", "");
  }, [error, form]);

  // Submits itself on the sixth digit. Driven by an effect on the watched
  // value rather than from inside `onChange`, so react-hook-form has
  // certainly committed the digit before `handleSubmit` reads it back.
  React.useEffect(() => {
    if (code?.length === 6 && !submitting) {
      void form.handleSubmit(onSubmit)();
    }
    // `onSubmit` is a fresh closure on every parent render; including it here
    // would re-fire the submit on each one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, submitting]);

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
            title="escriu el codi"
            icon={KeyRound}
            className="sm:grid-cols-1"
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              hem enviat un codi de sis xifres a{" "}
              <span className="font-medium text-foreground">{email}</span>.
              caduca d&apos;aquí a deu minuts.
            </p>

            <FormField
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  {/* No visible label: the sentence above already says what
                      the six boxes are for, so the name only has to exist for
                      a screen reader. There is no field root here to hand the
                      hidden input one. */}
                  <InputOTP
                    {...fieldProps(field, fieldState)}
                    ref={field.ref}
                    aria-label="codi de verificació"
                    maxLength={6}
                    autoFocus
                    disabled={submitting}
                    data-field-name="code"
                    className="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  {/* Not `FormMessage`: that one lives inside its field root,
                      and this root is a flex row of six boxes. Same shape as
                      the rejected-code line below it.

                      Suppressed while the server `error` is showing: a rejected
                      code clears the field, which drops it to zero digits and
                      makes the resolver's "sis xifres" length hint fire on top
                      of the real server error. In that state only the server
                      line should show. */}
                  {fieldState.error && !error && (
                    <p
                      className={cn(
                        FIELD_HINT,
                        "text-center font-medium text-destructive",
                      )}
                    >
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />

            {error && (
              <p
                role="alert"
                className={cn(
                  FIELD_HINT,
                  "text-center font-medium text-destructive",
                )}
              >
                {error}
              </p>
            )}
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
                    <Loader2 className="animate-spin" />
                    comprovant…
                  </>
                ) : (
                  "continua"
                )}
              </Button>
            </motion.div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={onResend}
                disabled={resendIn > 0 || resending}
                className="font-medium text-primary underline underline-offset-4 transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {resending
                  ? "enviant…"
                  : resendIn > 0
                    ? `torna a enviar-lo en ${resendIn}s`
                    : "torna a enviar-me el codi"}
              </button>
              <button
                type="button"
                onClick={onChangeEmail}
                className="inline-flex items-center gap-1 font-medium underline underline-offset-4 transition-colors hover:text-foreground"
              >
                <Pencil aria-hidden="true" className="size-3" />
                canvia el correu
              </button>
            </div>
          </div>
        </motion.div>
      </form>
    </Form>
  );
};

"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Pencil } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

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
  const lastSubmittedCode = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (error) form.setValue("code", "");
  }, [error, form]);

  React.useEffect(() => {
    if (code?.length !== 6) {
      lastSubmittedCode.current = undefined;
      return;
    }
    if (submitting || lastSubmittedCode.current === code) return;

    lastSubmittedCode.current = code;
    void form.handleSubmit(onSubmit)();
    // `onSubmit` changes with its parent render. The code value, not that
    // closure, is what should trigger the one automatic submission.
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
            <p
              id="registration-code-hint"
              className="text-sm leading-relaxed text-muted-foreground"
            >
              hem enviat un codi de sis xifres a{" "}
              <span className="font-medium break-all text-foreground">
                {email}
              </span>
              . caduca d&apos;aquí a deu minuts.
            </p>

            <FormField
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <InputOTP
                    {...fieldProps(field, fieldState)}
                    ref={field.ref}
                    aria-label="codi de verificació"
                    aria-describedby="registration-code-hint"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
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
                  {fieldState.error && !error ? (
                    <p
                      role="alert"
                      className={cn(
                        FIELD_HINT,
                        "text-center font-medium text-destructive",
                      )}
                    >
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {error ? (
              <p
                role="alert"
                className={cn(
                  FIELD_HINT,
                  "text-center font-medium text-destructive",
                )}
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
                className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
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
                <Pencil aria-hidden className="size-3" />
                canvia el correu
              </button>
            </div>
          </div>
        </motion.div>
      </form>
    </Form>
  );
};

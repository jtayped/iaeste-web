"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  GraduationCap,
  Loader2,
  Mail,
  Plus,
  User,
} from "lucide-react";

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

import { EitherDivider } from "@/components/form/either-divider";
import { FIELD_CONTROL, FIELD_HINT } from "@/components/form/field-styles";
import { childVariants } from "@/components/form/motion";
import { ExternalMemberNotice, Section } from "@/components/form/notices";
import {
  AT_LEAST_ONE_EMAIL_MESSAGE,
  emailStepFormSchema,
  emailStepSchema,
  type EmailStep,
  type EmailStepValues,
} from "@/lib/form-schema";

/**
 * Also the group's accessible name, so the fields are announced as one thing
 * to answer rather than as unrelated questions. It counts with what is on
 * screen: a plural heading over a single field is the first thing that makes
 * the step look like it is hiding work.
 */
const sectionTitle = (showPersonal: boolean) =>
  showPersonal ? "els teus correus" : "el teu correu";

/**
 * Step one accepts a university address, a personal one, or both — never
 * neither. Showing that as two peer fields made the whole group read as
 * optional, so only the university field is on screen to begin with and the
 * personal one is offered as an addition.
 *
 * The disclosure is worded as an invitation rather than as an escape hatch —
 * most people adding a second address simply want one, and framing it around
 * not having a UdL account puts a rare case in front of everybody. The person
 * who cannot fill the visible field is caught by the empty-submit message
 * instead, which names both ways forward.
 *
 * "At least one" is a rule about the pair, so when it fires the message goes
 * above both fields and neither field turns red. Blaming the personal field —
 * which is where the shared schema attaches it, and which may not even be on
 * screen — would point at the wrong control.
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
    // The pair's own error is attached to the personal field, and React Hook
    // Form would focus it — putting the caret in the second field to complain
    // about something neither field did. Focus is chosen below instead.
    shouldFocusError: false,
  });

  /**
   * The form holds raw strings; the flow wants the normalised pair, with a
   * blank field resolved to "not supplied". The wrapper schema already proved
   * this parse succeeds, so the guard is belt and braces.
   */
  const submit = (values: EmailStepValues) => {
    const parsed = emailStepSchema.safeParse(values);
    if (parsed.success) onSubmit(parsed.data);
  };

  /**
   * Land on the field that actually has to change: the university one for its
   * own mistakes and for an empty pair, where it is simply the first thing to
   * fill in, and the personal one only when it is the one at fault.
   */
  const focusFirstProblem = () => {
    const errors = form.formState.errors;
    const groupOnly =
      errors.personalEmail?.message === AT_LEAST_ONE_EMAIL_MESSAGE;
    form.setFocus(
      errors.universityEmail || groupOnly || !errors.personalEmail
        ? "universityEmail"
        : "personalEmail",
    );
  };

  const hintId = React.useId();
  const groupErrorId = React.useId();

  /** Reopened on the way back in, so a typed address is never hidden from its owner. */
  const [showPersonal, setShowPersonal] = React.useState(
    Boolean(defaults.personalEmail),
  );

  const university = form.watch("universityEmail");
  const personal = form.watch("personalEmail");
  const filled = [university, personal].filter((value) => value?.trim()).length;
  /**
   * One link is all this submit can send — either because only one field is on
   * screen, or because only one of the two has been filled in. The copy drops
   * to the singular so that filling in a single address is confirmed as
   * sufficient before anyone submits and finds out.
   */
  const single = !showPersonal || filled === 1;

  const title = sectionTitle(showPersonal);

  const groupError =
    form.formState.errors.personalEmail?.message === AT_LEAST_ONE_EMAIL_MESSAGE;

  /**
   * The shared message says "at least one address", which is a puzzle when only
   * one field is on screen. Collapsed, the error names both ways out instead —
   * fill this in, or open the one you cannot see.
   */
  const groupErrorMessage = showPersonal
    ? AT_LEAST_ONE_EMAIL_MESSAGE
    : "indica el teu correu universitari, o afegeix-ne un de personal.";

  const describedBy = groupError ? `${hintId} ${groupErrorId}` : hintId;

  const revealPersonal = () => {
    setShowPersonal(true);
    form.clearErrors("personalEmail");
  };

  const hidePersonal = () => {
    setShowPersonal(false);
    form.setValue("personalEmail", "", { shouldValidate: false });
    form.clearErrors("personalEmail");
  };

  return (
    <Form {...form}>
      <form
        noValidate
        aria-busy={submitting}
        onSubmit={form.handleSubmit(submit, focusFirstProblem)}
      >
        <motion.div
          variants={childVariants}
          className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <Section title={title} icon={Mail} className="sm:grid-cols-1">
            <div
              role="group"
              aria-label={title}
              aria-describedby={describedBy}
              className="grid gap-4"
            >
              <p
                id={hintId}
                className={cn(FIELD_HINT, "text-muted-foreground")}
              >
                {showPersonal
                  ? "amb una de les dues n'hi ha prou. si ens dones totes dues, et podrem escriure a la que et vagi millor."
                  : "amb una adreça n'hi ha prou: la de la udl, una de personal, o totes dues."}
              </p>

              {groupError ? (
                <p
                  id={groupErrorId}
                  role="alert"
                  className={cn(
                    FIELD_HINT,
                    "flex items-center gap-2 font-medium text-destructive",
                  )}
                >
                  <AlertCircle aria-hidden className="size-4 shrink-0" />
                  {groupErrorMessage}
                </p>
              ) : null}

              <FormField
                control={form.control}
                name="universityEmail"
                render={({ field, fieldState }) => (
                  <TextField {...fieldProps(field, fieldState)}>
                    <FormLabel className="flex items-center gap-2">
                      <GraduationCap
                        aria-hidden
                        className="size-4 text-primary"
                      />
                      correu universitari
                    </FormLabel>
                    <Input
                      {...field}
                      ref={field.ref}
                      placeholder="nom@alumnes.udl.cat"
                      data-field-name="universityEmail"
                      className={FIELD_CONTROL}
                      autoFocus
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                    />
                    <FormDescription className={FIELD_HINT}>
                      acceptem adreces @udl.cat i @alumnes.udl.cat.
                    </FormDescription>
                    <FormMessage className={cn(FIELD_HINT, "font-medium")} />
                  </TextField>
                )}
              />

              <AnimatePresence initial={false}>
                {showPersonal ? (
                  <motion.div
                    key="personal"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: 0.28,
                      ease: [0.16, 1, 0.3, 1],
                      opacity: { duration: 0.18 },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-4 pt-4">
                      <EitherDivider invalid={groupError} />

                      <FormField
                        control={form.control}
                        name="personalEmail"
                        render={({ field, fieldState }) => (
                          <TextField
                            {...fieldProps(field, fieldState)}
                            // Neither field is at fault when the pair is empty,
                            // so neither turns red — and both keep their hint,
                            // which is what someone about to fill one in needs.
                            isInvalid={
                              groupError ? false : Boolean(fieldState.error)
                            }
                          >
                            <FormLabel className="flex items-center gap-2">
                              <User
                                aria-hidden
                                className="size-4 text-primary"
                              />
                              correu personal
                            </FormLabel>
                            <Input
                              {...field}
                              ref={field.ref}
                              placeholder="nom@example.com"
                              data-field-name="personalEmail"
                              className={FIELD_CONTROL}
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                            />
                            <FormDescription className={FIELD_HINT}>
                              posa&apos;l si prefereixes que t&apos;escrivim a
                              una adreça teva.
                            </FormDescription>
                            {/* Shown above the pair instead when the pair is what failed. */}
                            {groupError ? null : (
                              <FormMessage
                                className={cn(FIELD_HINT, "font-medium")}
                              />
                            )}
                          </TextField>
                        )}
                      />

                      <button
                        type="button"
                        onClick={hidePersonal}
                        className="justify-self-start text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        treu l&apos;adreça personal
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="reveal"
                    type="button"
                    onClick={revealPersonal}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="inline-flex items-center gap-1.5 justify-self-start text-left text-xs leading-relaxed font-medium text-primary underline underline-offset-4 transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Plus aria-hidden className="size-3.5 shrink-0" />
                    afegeix una adreça personal
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

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
                    <Loader2 className="animate-spin" />
                    {single ? "enviant l'enllaç…" : "enviant els enllaços…"}
                  </>
                ) : single ? (
                  "envia'm l'enllaç"
                ) : (
                  "envia'm els enllaços"
                )}
              </Button>
            </motion.div>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              {single
                ? "enviarem un enllaç a aquesta adreça. l'has d'obrir per continuar."
                : "enviarem un enllaç a cada adreça que ens donis. hauràs d'obrir-los tots."}
            </p>
          </div>
        </motion.div>

        <ExternalMemberNotice />
      </form>
    </Form>
  );
};

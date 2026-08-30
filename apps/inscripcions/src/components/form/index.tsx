"use client";
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { Form } from "@repo/ui/form";
import NameField from "./fields/name";
import SurnameField from "./fields/surnames";
import DegreeField from "./fields/degree";
import YearField from "./fields/year";
import NoteField from "./fields/note";
import PhoneField from "./fields/phone";
import EmailField from "./fields/email";
import ConfirmEmailField from "./fields/confirm-email";
import { Button } from "@repo/ui/button";
import { AtSign, CircleUserRound, GraduationCap, Loader2 } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  FIELD_ORDER,
  isFormField,
  registrationFormSchema,
  toRegistration,
  type RegistrationForm,
} from "@/lib/form-schema";
import {
  ErrorSummary,
  ExternalMemberNotice,
  FormHeader,
  PreviousRegistrationNotice,
  Section,
} from "./notices";
import { childVariants, containerVariants, noticeVariants } from "./motion";
import { mapSubmitResult, type SubmitOutcome } from "@/lib/registration-flow";
import {
  recallRegistrationId,
  rememberRegistrationId,
} from "@/lib/registration-cookie";

const GENERIC_FAILURE =
  "no hem pogut desar la inscripció. torna-ho a provar d'aquí a un moment.";
const NETWORK_FAILURE =
  "no hem pogut connectar amb el servidor. comprova la connexió i torna-ho a provar.";

function firstInvalidField(errors: FieldErrors<RegistrationForm>) {
  return FIELD_ORDER.find((field) => errors[field]);
}

/**
 * Moves focus to the field the user has to fix first.
 *
 * Every control now exposes something focusable under `data-field-name` — the
 * degree combobox is a real button and the year segmented control is a real
 * radio — so the error summary is only the fallback for a collapsed note
 * field, which is not in the DOM at all when closed.
 */
function focusField(field: string | undefined) {
  const target =
    (field
      ? document.querySelector<HTMLElement>(`[data-field-name="${field}"]`)
      : null) ?? document.getElementById("form-error-summary");

  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function focusError(field?: string) {
  requestAnimationFrame(() => focusField(field));
}

const UserForm = () => {
  const router = useRouter();
  const [previousId, setPreviousId] = useState<string | undefined>();

  // A hint, never a gate: the server's ALREADY_REGISTERED response is the only
  // thing that decides whether this person can register again.
  useEffect(() => {
    setPreviousId(recallRegistrationId());
  }, []);

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationFormSchema),
    shouldFocusError: false,
    defaultValues: {
      name: "",
      surnames: "",
      email: "",
      confirmEmail: "",
      phone: "",
      degree: undefined,
      year: 1,
      note: "",
    },
  });

  const invalidFields = FIELD_ORDER.filter(
    (field) => form.formState.errors[field],
  );
  const showErrorSummary =
    invalidFields.length > 0 || Boolean(form.formState.errors.root);

  async function onSubmit(values: RegistrationForm) {
    form.clearErrors("root");

    let outcome: SubmitOutcome;
    try {
      outcome = mapSubmitResult(
        await apiClient.POST("/v1/registrations", {
          body: toRegistration(values),
        }),
      );
    } catch {
      form.setError("root", { message: NETWORK_FAILURE });
      focusError();
      return;
    }

    switch (outcome.kind) {
      case "created":
        rememberRegistrationId(outcome.id);
        router.push(
          `/verificacio-pendent?id=${encodeURIComponent(outcome.id)}`,
        );
        return;

      case "closed":
        router.push("/inscripcions-tancades");
        return;

      case "alreadyRegistered":
        router.push("/ja-inscrit");
        return;

      case "invalid": {
        const unmapped: string[] = [];

        for (const issue of outcome.issues) {
          if (isFormField(issue.field)) {
            form.setError(issue.field, { message: issue.message });
          } else {
            unmapped.push(issue.message);
          }
        }

        form.setError("root", {
          message:
            unmapped.length > 0
              ? unmapped.join(" ")
              : outcome.issues.length === 0
                ? "les dades no són vàlides. revisa el formulari i torna-ho a provar."
                : "revisa les dades marcades i torna-ho a provar.",
        });
        focusError(
          outcome.issues.map((issue) => issue.field).find(isFormField),
        );
        return;
      }

      case "failed":
        form.setError("root", { message: GENERIC_FAILURE });
        focusError();
        return;
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="py-10 sm:py-16"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Form {...form}>
          <form
            noValidate
            aria-busy={form.formState.isSubmitting}
            onSubmit={form.handleSubmit(onSubmit, (errors) =>
              focusError(firstInvalidField(errors)),
            )}
          >
            <FormHeader />

            {/* Notices live above the form surface: they are about the whole
                submission, not about any one field. */}
            <AnimatePresence initial={false}>
              {previousId && (
                <motion.div
                  key="previous"
                  variants={noticeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <div className="pb-4">
                    <PreviousRegistrationNotice id={previousId} />
                  </div>
                </motion.div>
              )}

              {showErrorSummary && (
                <motion.div
                  key="errors"
                  variants={noticeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <div className="pb-4">
                    <ErrorSummary
                      fields={invalidFields}
                      errors={form.formState.errors}
                      rootMessage={form.formState.errors.root?.message}
                      onSelectField={focusField}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              variants={childVariants}
              className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              <Section title="qui ets?" icon={CircleUserRound}>
                <NameField form={form} />
                <SurnameField form={form} />
              </Section>

              <Section title="com et podem contactar?" icon={AtSign}>
                {/* Email leads the row on its own so its hint has room, and
                    the confirmation lands directly underneath it. */}
                <div className="sm:col-span-2">
                  <EmailField form={form} />
                </div>
                <ConfirmEmailField form={form} />
                <PhoneField form={form} />
              </Section>

              <Section
                title="què estudies?"
                icon={GraduationCap}
                className="sm:grid-cols-1"
              >
                <DegreeField form={form} />
                <YearField form={form} />
              </Section>

              <div className="p-6 sm:p-8">
                <NoteField form={form} />
              </div>

              <div className="bg-muted/60 p-6 sm:p-8">
                <motion.div whileTap={{ scale: 0.99 }}>
                  <Button
                    className="h-11 w-full text-sm"
                    type="submit"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        enviant…
                      </>
                    ) : (
                      "inscriu-me"
                    )}
                  </Button>
                </motion.div>
                <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                  t&apos;enviarem un enllaç per verificar el correu. la
                  inscripció arriba al comitè quan hi facis clic.
                </p>
              </div>
            </motion.div>

            <ExternalMemberNotice />
          </form>
        </Form>
      </motion.div>
    </MotionConfig>
  );
};

export default UserForm;

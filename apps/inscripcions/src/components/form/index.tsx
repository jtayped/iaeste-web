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
import { Card } from "@repo/ui/card";
import {
  AlertCircleIcon,
  CircleUserRound,
  Loader2,
  School,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@repo/ui/alert";
import { apiClient } from "@/lib/api";
import {
  FIELD_ORDER,
  isFormField,
  registrationFormSchema,
  toRegistration,
  type RegistrationForm,
} from "@/lib/form-schema";
import {
  childVariants,
  containerVariants,
  ErrorSummary,
  ExternalMemberNotice,
  FormIntro,
  Group,
  PreviousRegistrationNotice,
} from "./notices";
import { mapSubmitResult, type SubmitOutcome } from "@/lib/registration-flow";
import {
  recallRegistrationId,
  rememberRegistrationId,
} from "@/lib/registration-cookie";

const GENERIC_FAILURE =
  "No hem pogut desar la inscripció. Torna-ho a provar d'aquí a un moment.";
const NETWORK_FAILURE =
  "No hem pogut connectar amb el servidor. Comprova la connexió i torna-ho a provar.";

function firstInvalidField(errors: FieldErrors<RegistrationForm>) {
  return FIELD_ORDER.find((field) => errors[field]);
}

/**
 * Moves focus to the field the user has to fix first. Radix-backed controls
 * (the degree select) expose no input to focus, and a collapsed note field is
 * not in the DOM at all, so the error summary is the fallback rather than
 * leaving focus stranded at the submit button.
 */
function focusField(field: string | undefined) {
  const target =
    (field ? document.querySelector<HTMLElement>(`[name="${field}"]`) : null) ??
    document.getElementById("form-error-summary");

  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "center", behavior: "smooth" });
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
          message: unmapped.length
            ? unmapped.join(" ")
            : "Revisa les dades marcades i torna-ho a provar.",
        });
        focusField(
          outcome.issues.map((issue) => issue.field).find(isFormField),
        );
        return;
      }

      case "failed":
        form.setError("root", { message: GENERIC_FAILURE });
        return;
    }
  }

  return (
    <motion.div
      className="py-10"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit, (errors) =>
            focusField(firstInvalidField(errors)),
          )}
        >
          <div className="space-y-6">
            <FormIntro />

            {previousId && <PreviousRegistrationNotice id={previousId} />}

            {invalidFields.length > 0 && (
              <ErrorSummary
                fields={invalidFields}
                errors={form.formState.errors}
              />
            )}

            <Group title="Qui ets?" icon={CircleUserRound}>
              <NameField form={form} />
              <SurnameField form={form} />
            </Group>

            <Group title="Com et podem contactar?" icon={Send}>
              <EmailField form={form} />
              <ConfirmEmailField form={form} />
              <PhoneField form={form} />
            </Group>

            <ExternalMemberNotice />

            <Group title="Què estudies?" icon={School}>
              <DegreeField form={form} />
              <YearField form={form} />
            </Group>

            <motion.div variants={childVariants}>
              <Card>
                <NoteField form={form} />
              </Card>
            </motion.div>

            <motion.div variants={childVariants}>
              <Button
                className="w-full"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Enviant…
                  </>
                ) : (
                  "Inscriu-me"
                )}
              </Button>
            </motion.div>

            {form.formState.errors.root && (
              <Alert variant="destructive" aria-live="polite">
                <AlertCircleIcon />
                <AlertTitle>Ups!</AlertTitle>
                <AlertDescription>
                  {form.formState.errors.root?.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

export default UserForm;

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
  Info,
  Loader2,
  LucideIcon,
  MailCheck,
  School,
  Send,
} from "lucide-react";
import { H1, Link as TextLink, Paragraph } from "@repo/ui/typography";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@repo/ui/alert";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import {
  FIELD_LABELS,
  FIELD_ORDER,
  isFormField,
  registrationFormSchema,
  toRegistration,
  type RegistrationForm,
} from "@/lib/form-schema";
import { mapSubmitResult, type SubmitOutcome } from "@/lib/registration-flow";
import {
  recallRegistrationId,
  rememberRegistrationId,
} from "@/lib/registration-cookie";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.15,
      duration: 0.4,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const GENERIC_FAILURE =
  "No hem pogut desar la inscripció. Torna-ho a provar d'aquí a un moment.";
const NETWORK_FAILURE =
  "No hem pogut connectar amb el servidor. Comprova la connexió i torna-ho a provar.";

const inlineLink = "font-medium text-primary underline underline-offset-4";

const Group = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) => {
  return (
    <motion.div variants={childVariants}>
      <Card>
        <div className="flex items-center gap-2">
          <Icon size={19} />
          <p className="text-lg font-medium">{title}</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div>
      </Card>
    </motion.div>
  );
};

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
            <motion.div variants={childVariants}>
              <Card>
                <H1>Benvingut/da!</H1>
                <Paragraph>
                  Omple el formulari amb la teva informació per
                  inscriure&apos;t. Després t&apos;enviarem un correu per
                  verificar l&apos;adreça: la inscripció no arriba al comitè
                  fins que hi facis clic.
                </Paragraph>
              </Card>
            </motion.div>

            {previousId && (
              <motion.div variants={childVariants}>
                <Alert>
                  <Info />
                  <AlertTitle>Ja t&apos;havies inscrit?</AlertTitle>
                  <AlertDescription>
                    Des d&apos;aquest dispositiu ja s&apos;ha enviat una
                    inscripció.{" "}
                    <Link
                      className={inlineLink}
                      href={`/verificacio-pendent?id=${encodeURIComponent(previousId)}`}
                    >
                      Consulta&apos;n l&apos;estat
                    </Link>{" "}
                    o continua omplint el formulari si vols inscriure una altra
                    persona.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {invalidFields.length > 0 && (
              <motion.div variants={childVariants}>
                <Alert
                  variant="destructive"
                  id="form-error-summary"
                  tabIndex={-1}
                  aria-live="polite"
                >
                  <AlertCircleIcon />
                  <AlertTitle>Falten dades per revisar</AlertTitle>
                  <AlertDescription>
                    <ul className="ml-4 list-disc">
                      {invalidFields.map((field) => (
                        <li key={field}>
                          {FIELD_LABELS[field]}:{" "}
                          {form.formState.errors[field]?.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </motion.div>
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

            <motion.div variants={childVariants}>
              <Alert>
                <MailCheck />
                <AlertTitle>No estudies a la UdL?</AlertTitle>
                <AlertDescription>
                  Aquest formulari és per a estudiants de la UdL. Si el comitè
                  t&apos;ha convidat a formar-ne part des de fora, rebràs la
                  invitació al teu correu i no cal que passis per aquí. Si tens
                  dubtes,{" "}
                  <TextLink href="mailto:iaeste@udl.cat">
                    escriu-nos a iaeste@udl.cat
                  </TextLink>
                  .
                </AlertDescription>
              </Alert>
            </motion.div>

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

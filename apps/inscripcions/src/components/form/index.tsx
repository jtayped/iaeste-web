"use client";
import React, { useEffect } from "react";
import Cookies from "js-cookie";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  type Registration,
  registrationSchema,
} from "@repo/constants/validators/registration";
import { createApiClient } from "@repo/api-client";
import { env } from "@repo/env/inscripcions";
import { Form } from "@repo/ui/form";
import NameField from "./fields/name";
import DegreeField from "./fields/degree";
import YearField from "./fields/year";
import NoteField from "./fields/note";
import PhoneField from "./fields/phone";
import EmailField from "./fields/email";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import SurnameField from "./fields/surnames";
import {
  AlertCircleIcon,
  CircleUserRound,
  Loader2,
  LucideIcon,
  School,
  Send,
} from "lucide-react";
import { H1, Paragraph } from "@repo/ui/typography";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@repo/ui/alert";
import { ALREADY_SUBMITTED } from "@/constants/errors";
import PreviousMemberField from "./fields/previous-member";

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

const apiClient = createApiClient(env.NEXT_PUBLIC_API_URL);

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

const UserForm = () => {
  const router = useRouter();

  // Redirect if cookie already exists
  useEffect(() => {
    const submitted = Cookies.get("form_submitted");
    if (submitted) {
      router.replace(`/gracies?error=${ALREADY_SUBMITTED}`);
    }
  }, [router]);

  const form = useForm<Registration>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      surnames: "",
      email: "",
      phone: "",
      degree: undefined,
      year: 1,
      previousMember: false,
      note: "",
    },
  });

  async function onSubmit(values: Registration) {
    form.clearErrors("root");

    try {
      const { error } = await apiClient.POST("/v1/registrations", {
        body: values,
      });

      if (error) {
        form.setError("root", {
          message:
            error.error.code === "VALIDATION_ERROR"
              ? "Revisa les dades del formulari i torna-ho a provar."
              : "No hem pogut guardar la inscripció. Torna-ho a provar.",
        });
        return;
      }

      Cookies.set("form_submitted", "true", {
        expires: 365,
        sameSite: "strict",
        secure: window.location.protocol === "https:",
      });
      router.push(`/gracies?name=${encodeURIComponent(values.name)}`);
    } catch {
      form.setError("root", {
        message:
          "No hem pogut connectar amb el servidor. Comprova la connexió i torna-ho a provar.",
      });
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
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <motion.div variants={childVariants}>
              <Card>
                <H1>Benvingut/da!</H1>
                <Paragraph>
                  Omple el formulari amb la teva informació per inscriure&apos;t
                </Paragraph>
              </Card>
            </motion.div>

            <Group title="Qui ets?" icon={CircleUserRound}>
              <NameField form={form} />
              <SurnameField form={form} />
            </Group>

            <Group title="Com et podem contactar?" icon={Send}>
              <EmailField form={form} />
              <PhoneField form={form} />
            </Group>

            <Group title="Què estudies?" icon={School}>
              <DegreeField form={form} />
              <YearField form={form} />
            </Group>

            <PreviousMemberField form={form} />

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
                  <Loader2 className="animate-spin" />
                ) : (
                  "Inscriu-me"
                )}
              </Button>
            </motion.div>
            {form.formState.errors.root && (
              <Alert variant="destructive">
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

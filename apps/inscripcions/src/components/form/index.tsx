"use client";
import React, { useEffect } from "react";
import Cookies from "js-cookie";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { User, userSchema } from "@repo/constants/validators/user";
import { Form } from "@repo/ui/form";
import NameField from "./fields/name";
import DegreeField from "./fields/degree";
import YearField from "./fields/year";
import NoteField from "./fields/note";
import NumberField from "./fields/number";
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
import { api } from "@repo/trpc/react";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@repo/ui/alert";
import { ALREADY_SUBMITTED } from "@/constants/errors";

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
          <p className="font-medium text-lg">{title}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-6">{children}</div>
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

  const form = useForm<User>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      surnames: "",
      email: "",
      number: "",
      degree: undefined,
      year: 1,
      note: "",
    },
  });

  const userMutation = api.user.create.useMutation({
    onSuccess(data) {
      // Save cookie (expires in 7 days)
      Cookies.set("form_submitted", "true", { expires: 7 });
      router.push(`/gracies?name=${data.name}`);
    },
    onError(error) {
      const code = error.data?.code;
      const message = error.message;

      if (code === "CONFLICT") {
        if (message.toLowerCase().includes("email")) {
          form.setError("email", {
            type: "manual",
            message: "Aquest correu ja està registrat.",
          });
        } else if (
          message.toLowerCase().includes("número") ||
          message.toLowerCase().includes("numero")
        ) {
          form.setError("number", {
            type: "manual",
            message: "Aquest número ja està registrat.",
          });
        } else {
          form.setError("root", {
            type: "manual",
            message: message || "Ja existeix una entrada duplicada.",
          });
        }
      } else {
        form.setError("root", {
          type: "manual",
          message: "Hi ha hagut un problema al inscriure't! :(",
        });
      }
    },
  });

  async function onSubmit(values: User) {
    await userMutation.mutateAsync(values);
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
              <NumberField form={form} />
            </Group>

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

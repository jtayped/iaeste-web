"use client";
import React from "react";
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
import { CircleUserRound, LucideIcon, School, Send } from "lucide-react";
import { H1, Paragraph } from "@repo/ui/typography";

import { motion } from "framer-motion";

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

  function onSubmit(values: User) {
    console.log(values);
  }

  return (
    <motion.div
      className="py-10 px-4"
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
              <Button className="w-full" type="submit">
                Inscriu-me
              </Button>
            </motion.div>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

export default UserForm;

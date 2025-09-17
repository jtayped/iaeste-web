"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { User, userSchema } from "@/schemas/user";
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
    <Card>
      <div className="flex items-center gap-2">
        <Icon size={19} />
        <p className="font-medium text-lg">{title}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-6">{children}</div>
    </Card>
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <Card>
            <H1>Benvingut/da!</H1>
            <Paragraph>
              Omple el formulari amb la teva informació per inscriure&apos;t
            </Paragraph>
          </Card>
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
          <Card>
            <NoteField form={form} />
          </Card>
          <Button className="w-full">Envia</Button>
        </div>
      </form>
    </Form>
  );
};

export default UserForm;

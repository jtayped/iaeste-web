"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { CircleUserRound, Loader2, School } from "lucide-react";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Form } from "@repo/ui/form";
import { H1, Paragraph } from "@repo/ui/typography";

import {
  BoundEmail,
  DegreeField,
  NameField,
  PhoneField,
  SurnamesField,
  YearField,
} from "@/components/convit/fields";
import {
  childVariants,
  containerVariants,
  Group,
} from "@/components/form/notices";
import type { Invitation } from "@/lib/invitation-flow";
import {
  invitationFormSchema,
  type InvitationForm,
} from "@/lib/invitation-schema";

/**
 * The onboarding form an invited person fills in.
 *
 * It is shorter than the public one on purpose: no email (bound to the token),
 * no confirmation field, and no free-text note — this person has already been
 * vetted by whoever invited them, so there is nothing for a reviewer to read.
 */
export function ConvitForm({
  invitation,
  submitting,
  error,
  onSubmit,
}: {
  invitation: Invitation;
  submitting: boolean;
  error?: string;
  onSubmit: (values: InvitationForm) => void;
}) {
  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      name: invitation.prefillName ?? "",
      surnames: invitation.prefillSurnames ?? "",
      phone: "",
      degree: undefined,
      year: 1,
    },
  });

  return (
    <motion.div
      className="py-10"
      initial={false}
      animate="visible"
      variants={containerVariants}
    >
      <Form {...form}>
        <form
          noValidate
          aria-busy={submitting}
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-6">
            <motion.div variants={childVariants}>
              <Card>
                <H1>t&apos;han convidat a l&apos;equip</H1>
                <Paragraph>
                  entraràs a <strong>{invitation.campaignLabel}</strong>. omple
                  aquestes dades i ja estàs dins: no has de passar pel formulari
                  públic ni esperar cap revisió.
                </Paragraph>
              </Card>
            </motion.div>

            {error ? (
              <motion.div variants={childVariants}>
                <Card>
                  <p className="text-sm text-destructive">{error}</p>
                </Card>
              </motion.div>
            ) : null}

            <Group title="qui ets?" icon={CircleUserRound}>
              <NameField form={form} />
              <SurnamesField form={form} />
              <BoundEmail email={invitation.email} />
              <PhoneField form={form} />
            </Group>

            <Group title="què estudies?" icon={School}>
              <DegreeField form={form} />
              <YearField form={form} />
            </Group>

            <motion.div variants={childVariants}>
              <Button
                className="min-h-11 w-full"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    entrant…
                  </>
                ) : (
                  "entra a l'equip"
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}

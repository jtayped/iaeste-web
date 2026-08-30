"use client";

import React from "react";
import { motion, MotionConfig } from "framer-motion";

import { containerVariants } from "@/components/form/motion";
import { FormHeader } from "@/components/form/notices";

import { CodeStepForm } from "./code-step";
import { DetailsStepForm } from "./details-step";
import { EmailStepForm } from "./email-step";
import { Progress, type Step } from "./progress";
import {
  AcceptedScreen,
  InvalidInvitationScreen,
  LoadingInvitationScreen,
  RateLimitedScreen,
  UnreachableScreen,
} from "./screens";
import { useRegistrationFlow, type Mode } from "./use-flow";

export type { Mode };

const PUBLIC_STEPS: readonly Step[] = [
  { key: "email", label: "correu" },
  { key: "code", label: "codi" },
  { key: "details", label: "dades" },
];

/**
 * The invited person has already done the first two steps by opening a link
 * we mailed them, so they see the two that are left rather than a wizard
 * whose first half is pre-ticked.
 */
const INVITED_STEPS: readonly Step[] = [
  { key: "invitation", label: "convit" },
  { key: "details", label: "dades" },
];

const HEADINGS = {
  email: {
    title: "inscriu-te",
    lead: "comencem pel teu correu. són dos minuts en total.",
  },
  code: {
    title: "confirma el correu",
    lead: "mira la teva safata d'entrada i escriu el codi que t'hem enviat.",
  },
  detailsPublic: {
    title: "les teves dades",
    lead: "l'últim pas. revisa-ho tot i envia la inscripció.",
  },
  detailsInvited: {
    title: "t'han convidat a l'equip",
    lead: "omple aquestes dades i ja estàs dins. no has d'esperar cap revisió.",
  },
} as const;

/**
 * One flow, two ways in.
 *
 * `/formulari` starts at the email step; `/convit` starts at the details step
 * with the address already proven by the invitation token. Everything from
 * that point on is the same component tree, so the two pages cannot drift
 * into looking like different products the way the old separate `/convit`
 * form did.
 *
 * The difference that survives is the one that is real: an invited person was
 * pre-approved by whoever invited them and becomes a member on submit, while
 * a public applicant joins the committee's review queue.
 */
export const RegistrationFlow = ({ mode }: { mode: Mode }) => {
  const flow = useRegistrationFlow(mode);
  const { stage, invited } = flow;

  if (stage.kind === "loadingInvitation") return <LoadingInvitationScreen />;
  if (stage.kind === "invalidInvitation") return <InvalidInvitationScreen />;
  if (stage.kind === "rateLimited")
    return <RateLimitedScreen onRetry={stage.retry} />;
  if (stage.kind === "unreachable")
    return <UnreachableScreen onRetry={stage.retry} />;
  if (stage.kind === "accepted")
    return <AcceptedScreen alreadyMember={stage.alreadyMember} />;

  const steps = invited ? INVITED_STEPS : PUBLIC_STEPS;
  const currentStep = invited
    ? 1
    : stage.kind === "email"
      ? 0
      : stage.kind === "code"
        ? 1
        : 2;

  const heading =
    stage.kind === "email"
      ? HEADINGS.email
      : stage.kind === "code"
        ? HEADINGS.code
        : invited
          ? HEADINGS.detailsInvited
          : HEADINGS.detailsPublic;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="py-10 sm:py-16"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <FormHeader title={heading.title} lead={heading.lead} />
        <Progress steps={steps} current={currentStep} />

        {stage.kind === "email" && (
          <EmailStepForm
            defaultEmail={flow.email}
            submitting={flow.busy}
            {...(flow.error ? { error: flow.error } : {})}
            onSubmit={(values) => void flow.sendCode(values.email, false)}
          />
        )}

        {stage.kind === "code" && (
          <CodeStepForm
            email={stage.email}
            submitting={flow.busy}
            {...(flow.error ? { error: flow.error } : {})}
            resendIn={flow.resendIn}
            resending={flow.resending}
            onSubmit={(values) => void flow.submitCode(stage.email, values)}
            onResend={() => void flow.sendCode(stage.email, true)}
            onChangeEmail={flow.changeEmail}
          />
        )}

        {stage.kind === "details" && (
          <DetailsStepForm
            context={stage.context}
            submitting={flow.busy}
            {...(flow.error ? { error: flow.error } : {})}
            fieldIssues={flow.fieldIssues}
            onSubmit={(values) => void flow.submitDetails(values)}
          />
        )}
      </motion.div>
    </MotionConfig>
  );
};

export default RegistrationFlow;

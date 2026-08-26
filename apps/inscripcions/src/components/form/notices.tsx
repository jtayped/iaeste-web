"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircleIcon, Info, LucideIcon, MailCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Card } from "@repo/ui/card";
import { H1, Link as TextLink, Paragraph } from "@repo/ui/typography";
import type { FieldErrors } from "react-hook-form";

import { FIELD_LABELS, type RegistrationForm } from "@/lib/form-schema";

export const containerVariants = {
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

export const childVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const inlineLink = "font-medium text-primary underline underline-offset-4";

/** A titled card holding a couple of related fields. */
export const Group = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) => (
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

export const FormIntro = () => (
  <motion.div variants={childVariants}>
    <Card>
      <H1>Benvingut/da!</H1>
      <Paragraph>
        Omple el formulari amb la teva informació per inscriure&apos;t. Després
        t&apos;enviarem un correu per verificar l&apos;adreça: la inscripció no
        arriba al comitè fins que hi facis clic.
      </Paragraph>
    </Card>
  </motion.div>
);

/**
 * Shown when this browser has registered before. Deliberately an offer, not a
 * wall — only the API knows whether an address is already taken.
 */
export const PreviousRegistrationNotice = ({ id }: { id: string }) => (
  <motion.div variants={childVariants}>
    <Alert>
      <Info />
      <AlertTitle>Ja t&apos;havies inscrit?</AlertTitle>
      <AlertDescription>
        Des d&apos;aquest dispositiu ja s&apos;ha enviat una inscripció.{" "}
        <Link
          className={inlineLink}
          href={`/verificacio-pendent?id=${encodeURIComponent(id)}`}
        >
          Consulta&apos;n l&apos;estat
        </Link>{" "}
        o continua omplint el formulari si vols inscriure una altra persona.
      </AlertDescription>
    </Alert>
  </motion.div>
);

/** Every outstanding problem in one place, above the fold, focusable. */
export const ErrorSummary = ({
  fields,
  errors,
}: {
  fields: readonly (keyof typeof FIELD_LABELS)[];
  errors: FieldErrors<RegistrationForm>;
}) => (
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
          {fields.map((field) => (
            <li key={field}>
              {FIELD_LABELS[field]}: {errors[field]?.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  </motion.div>
);

/** Invited external members never come through this form (see IA-32). */
export const ExternalMemberNotice = () => (
  <motion.div variants={childVariants}>
    <Alert>
      <MailCheck />
      <AlertTitle>No estudies a la UdL?</AlertTitle>
      <AlertDescription>
        Aquest formulari és per a estudiants de la UdL. Si el comitè t&apos;ha
        convidat a formar-ne part des de fora, rebràs la invitació al teu correu
        i no cal que passis per aquí. Si tens dubtes,{" "}
        <TextLink href="mailto:iaeste@udl.cat">
          escriu-nos a iaeste@udl.cat
        </TextLink>
        .
      </AlertDescription>
    </Alert>
  </motion.div>
);

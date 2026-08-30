"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircleIcon, LucideIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import type { FieldErrors } from "react-hook-form";

import { FIELD_LABELS, type RegistrationForm } from "@/lib/form-schema";
import { FIELD_HINT, SECTION_HEADING } from "./field-styles";
import { childVariants } from "./motion";

/**
 * One group of related fields.
 *
 * Deliberately not a card. The previous version wrapped every group, the
 * intro and both notices in their own bordered card, so the page was a stack
 * of six boxes on a tinted background and nothing looked more important than
 * anything else. Sections now share one surface and are separated by a
 * hairline, which is enough to group them and costs no visual noise.
 */
export const Section = ({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className="p-6 sm:p-8">
    <div className="flex items-center gap-2.5">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <h2 className={SECTION_HEADING}>{title}</h2>
    </div>
    <div className={cn("mt-5 grid gap-5 sm:grid-cols-2", className)}>
      {children}
    </div>
  </section>
);

/**
 * The page header, above the form surface rather than inside a card of its
 * own. The logo carries continuity from the landing screen; the single line
 * under the title is the whole of what used to be an intro paragraph, because
 * the "we will email you to verify" detail now sits next to the submit button
 * where it actually applies.
 */
export const FormHeader = () => (
  <motion.header variants={childVariants} className="mb-6 sm:mb-8">
    <Image
      src="/logos/icon-lleida-blue.png"
      width={44}
      height={44}
      priority
      alt="logo d'iaeste lc lleida"
      className="mb-5 h-11 w-11"
    />
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
      inscriu-te
    </h1>
    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
      omple les teves dades i uneix-te al comitè. són dos minuts.
    </p>
  </motion.header>
);

/**
 * Shown when this browser has registered before. Deliberately an offer, not a
 * wall — only the API knows whether an address is already taken.
 */
export const PreviousRegistrationNotice = ({ id }: { id: string }) => (
  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
    <span>ja has enviat una inscripció des d&apos;aquest dispositiu.</span>
    <Link
      className="font-medium text-primary underline underline-offset-4"
      href={`/verificacio-pendent?id=${encodeURIComponent(id)}`}
    >
      consulta&apos;n l&apos;estat
    </Link>
  </div>
);

/** Every outstanding problem in one place, above the fold, focusable. */
export const ErrorSummary = ({
  fields,
  errors,
  rootMessage,
  onSelectField,
}: {
  fields: readonly (keyof typeof FIELD_LABELS)[];
  errors: FieldErrors<RegistrationForm>;
  rootMessage?: string;
  onSelectField: (field: string) => void;
}) => (
  <div
    role="alert"
    id="form-error-summary"
    tabIndex={-1}
    aria-live="polite"
    className="rounded-md border border-destructive/40 bg-destructive/5 p-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
  >
    <div className="flex items-center gap-2 text-destructive">
      <AlertCircleIcon aria-hidden="true" className="size-4 shrink-0" />
      <p className={SECTION_HEADING}>
        {fields.length > 0
          ? "revisa les dades marcades"
          : "no ho hem pogut enviar"}
      </p>
    </div>
    <div className={cn(FIELD_HINT, "mt-2 space-y-1 text-muted-foreground")}>
      {rootMessage && <p>{rootMessage}</p>}
      {fields.length > 0 && (
        <ul className="space-y-1">
          {fields.map((field) => (
            <li key={field}>
              <button
                type="button"
                className="text-left underline decoration-muted-foreground/30 underline-offset-4 transition-colors hover:text-destructive hover:decoration-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
                onClick={() => onSelectField(field)}
              >
                {FIELD_LABELS[field]}: {errors[field]?.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

/**
 * Invited external members never come through this form (see IA-32).
 *
 * A footnote under the form rather than an alert inside it: it applies to
 * almost nobody who reaches this page, so it does not deserve a box competing
 * with the fields.
 */
export const ExternalMemberNotice = () => (
  <motion.p
    variants={childVariants}
    className="mt-6 text-center text-xs leading-relaxed text-muted-foreground"
  >
    si el comitè t&apos;ha convidat des de fora de la udl, rebràs la invitació
    per correu i no cal que passis per aquí. dubtes?{" "}
    <a
      className="font-medium text-primary underline underline-offset-4"
      href="mailto:iaeste@udl.cat"
    >
      iaeste@udl.cat
    </a>
  </motion.p>
);

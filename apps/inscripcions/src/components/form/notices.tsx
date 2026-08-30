"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertCircleIcon, LucideIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { Logo } from "@repo/ui/logo";
import type { FieldErrors } from "react-hook-form";

import { FIELD_LABELS, type ProfileForm } from "@/lib/form-schema";
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
 * own. The logo carries continuity from the landing screen.
 *
 * Title and lead are props now: the flow is three steps and each one is
 * asking for something different, so a fixed "inscriu-te" would go stale by
 * the second screen while the logo and scale stay put.
 */
export const FormHeader = ({
  title,
  lead,
}: {
  title: string;
  lead: string;
}) => (
  <motion.header variants={childVariants} className="mb-6 sm:mb-8">
    <Logo variant="icon" width={44} priority className="mb-5 size-11" />
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
      {title}
    </h1>
    <p className="mt-2 text-sm text-muted-foreground sm:text-base">{lead}</p>
  </motion.header>
);

/** Every outstanding problem in one place, above the fold, focusable. */
export const ErrorSummary = ({
  fields,
  errors,
  rootMessage,
  onSelectField,
}: {
  fields: readonly (keyof typeof FIELD_LABELS)[];
  errors: FieldErrors<ProfileForm>;
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
 * Invited external members never come through the public first step (see
 * IA-32), so this belongs to that step alone.
 *
 * A footnote rather than an alert inside the form: it applies to almost
 * nobody who reaches this page, so it does not deserve a box competing with
 * the fields.
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

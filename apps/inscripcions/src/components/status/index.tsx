"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import Confetti from "react-confetti";
import {
  CalendarOff,
  Link2Off,
  Loader2,
  MailCheck,
  MailQuestion,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import { EASE_OUT } from "@/components/form/motion";

/**
 * The status screens share the registration form's motion and type scale, so
 * arriving here from the form does not feel like landing on another site.
 * Timings are the form's: quick, capped, and led by the icon because that is
 * what tells the applicant the outcome before they read a word.
 */
const iconVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
} as const;

const textVariants = {
  hidden: { y: 12, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: 0.08 + i * 0.07, duration: 0.4, ease: EASE_OUT },
  }),
} as const;

/**
 * Tone is what separates these screens at a glance. Every outcome in the
 * registration flow lands on this component, so a rejected application must
 * not look like a verified email and a closed campaign must not look like a
 * failure the applicant caused.
 */
const toneClasses = {
  positive: "text-primary",
  neutral: "text-muted-foreground",
  warning: "text-amber-700",
  negative: "text-destructive",
} as const;

/**
 * The icon sits in a disc rather than floating at 96px: the tone still reads
 * instantly, but the screen gains a focal point sized like the rest of the
 * app instead of a billboard.
 *
 * The disc is the card surface, not a tint — the page background is already
 * `bg-primary/10`, so a 10% tone tint on top of it barely separates. The ring
 * carries the tone instead, and reads against the tinted page.
 */
const toneSurfaces = {
  positive: "bg-background ring-1 ring-primary/20",
  neutral: "bg-background ring-1 ring-border",
  warning: "bg-background ring-1 ring-amber-500/30",
  negative: "bg-background ring-1 ring-destructive/25",
} as const;

const statusIcons = {
  "calendar-off": CalendarOff,
  "link-off": Link2Off,
  loading: Loader2,
  "mail-check": MailCheck,
  "mail-question": MailQuestion,
  "shield-check": ShieldCheck,
  warning: TriangleAlert,
  "user-check": UserCheck,
} as const;

export type StatusTone = keyof typeof toneClasses;

interface StatusScreenProps {
  /** A serializable name so server pages never pass component functions over the RSC boundary. */
  icon: keyof typeof statusIcons;
  /** Extra classes for the icon, e.g. `animate-spin` while something is in flight. */
  iconClassName?: string;
  title: string;
  tone?: StatusTone;
  /** One or more paragraphs of body copy. */
  children: ReactNode;
  /** Buttons or links shown under the copy. */
  actions?: ReactNode;
  /** Extra detail below the actions, e.g. a fine-print note. */
  footnote?: ReactNode;
  celebrate?: boolean;
}

const Celebration = () => {
  const reduceMotion = useReducedMotion();
  const [running, setRunning] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (reduceMotion) return;

    setRunning(true);
    setSize({ width: window.innerWidth, height: window.innerHeight });

    const timer = setTimeout(() => setRunning(false), 5000);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  if (!running) return null;

  return (
    <Confetti
      aria-hidden="true"
      className="pointer-events-none"
      width={size.width}
      height={size.height}
      numberOfPieces={200}
      recycle={false}
      gravity={0.3}
    />
  );
};

const StatusScreen = ({
  icon,
  iconClassName,
  title,
  tone = "neutral",
  children,
  actions,
  footnote,
  celebrate = false,
}: StatusScreenProps) => {
  const Icon = statusIcons[icon];

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-dvh items-center justify-center py-10 sm:py-16">
        {celebrate && <Celebration />}

        <div className="w-full text-center">
          <motion.div
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              "mx-auto mb-6 flex size-16 items-center justify-center rounded-full sm:size-20",
              toneSurfaces[tone],
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "size-7 sm:size-8",
                toneClasses[tone],
                iconClassName,
              )}
            />
          </motion.div>

          <motion.h1
            custom={0}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {title}
          </motion.h1>

          <motion.div
            custom={1}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base [&>p:not(:first-child)]:mt-4 [&>p]:mt-0"
          >
            {children}
          </motion.div>

          {actions && (
            <motion.div
              custom={2}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="mt-8 flex w-full flex-col items-center gap-3 [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:w-auto"
            >
              {actions}
            </motion.div>
          )}

          {footnote && (
            <motion.div
              custom={3}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              /* text-sm, not text-xs: footnotes here sometimes hold a full
                 Alert, whose title would otherwise render smaller than its
                 own body text. */
              className="mx-auto mt-8 max-w-prose text-sm leading-relaxed text-muted-foreground"
            >
              {footnote}
            </motion.div>
          )}
        </div>
      </main>
    </MotionConfig>
  );
};

export { StatusScreen };
export default StatusScreen;

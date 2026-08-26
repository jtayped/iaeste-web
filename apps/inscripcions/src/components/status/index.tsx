"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { H1 } from "@repo/ui/typography";
import { cn } from "@repo/ui/lib/utils";

const iconVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { stiffness: 200, damping: 20, delay: 0.2 },
  },
};

const textVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: 0.3 + i * 0.15, duration: 0.5 },
  }),
};

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
    <main className="flex min-h-dvh items-center justify-center py-8 sm:py-12">
      {celebrate && <Celebration />}

      <div className="w-full text-center">
        <motion.div variants={iconVariants} initial={false} animate="visible">
          <Icon
            aria-hidden="true"
            className={cn(
              "mx-auto mb-6 h-20 w-20 sm:h-24 sm:w-24",
              toneClasses[tone],
              iconClassName,
            )}
          />
        </motion.div>

        <motion.div
          custom={0}
          variants={textVariants}
          initial={false}
          animate="visible"
        >
          <H1>{title}</H1>
        </motion.div>

        <motion.div
          custom={1}
          variants={textVariants}
          initial={false}
          animate="visible"
          className="mx-auto max-w-prose text-muted-foreground"
        >
          {children}
        </motion.div>

        {actions && (
          <motion.div
            custom={2}
            variants={textVariants}
            initial={false}
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
            initial={false}
            animate="visible"
            className="mx-auto mt-8 max-w-prose text-sm text-muted-foreground"
          >
            {footnote}
          </motion.div>
        )}
      </div>
    </main>
  );
};

export { StatusScreen };
export default StatusScreen;

"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "framer-motion";

import { childVariants } from "@/components/form/motion";

export interface Step {
  key: string;
  label: string;
}

/**
 * Where you are in a flow that is now more than one screen.
 *
 * Three dots and a rule, not a numbered wizard chrome: the point is to say
 * "this is short and you are nearly through it", which is exactly the
 * reassurance a form that suddenly asks for an email code needs to give. A
 * two-step invited flow renders the same component with two entries, so the
 * shape of the page never changes between the two ways in.
 */
export const Progress = ({
  steps,
  current,
}: {
  steps: readonly Step[];
  current: number;
}) => (
  <motion.ol
    variants={childVariants}
    className="mb-6 flex items-center justify-between gap-2"
    aria-label="passos de la inscripció"
  >
    {steps.map((step, index) => {
      const done = index < current;
      const active = index === current;

      return (
        <li
          key={step.key}
          className={cn(
            "flex items-center gap-2",
            index < steps.length - 1 && "flex-1",
          )}
        >
          <span
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
              done && "bg-primary text-primary-foreground",
              active && "bg-primary text-primary-foreground",
              !done && !active && "bg-default text-muted-foreground",
            )}
          >
            {done ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : (
              index + 1
            )}
          </span>
          <span
            className={cn(
              "truncate text-xs font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "hidden h-px flex-1 transition-colors sm:block",
                done ? "bg-primary/40" : "bg-border",
              )}
            />
          )}
        </li>
      );
    })}
  </motion.ol>
);

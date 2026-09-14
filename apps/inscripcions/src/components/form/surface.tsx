"use client";

import React from "react";
import { motion } from "framer-motion";

import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

import { childVariants } from "./motion";

const MotionCard = motion.create(Card);

/**
 * The registration flow's surface.
 *
 * Every step is one card: the shared `Card` from `@repo/ui`, so the corner,
 * the border and the shadow are the ones the public site and the admin use,
 * and the next change to that surface reaches this app without anyone
 * remembering it exists. Each step used to spell the same box out by hand —
 * `rounded-xl border bg-card shadow-sm` in six files — which is how the
 * registration site ended up a step behind the rest of the product.
 *
 * Padding is off by default because most steps are a stack of `Section`s
 * separated by a hairline, and each of those owns its own padding. A step that
 * is a single block of copy passes `p-6 sm:p-8` back.
 *
 * The step entrance rides on the card itself rather than on a wrapper, so
 * there is no extra box in the DOM between the page and the surface.
 */
export const FormCard = ({
  className,
  ...props
}: React.ComponentProps<typeof MotionCard>) => (
  <MotionCard
    variants={childVariants}
    className={cn("p-0", className)}
    {...props}
  />
);

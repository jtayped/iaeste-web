"use client";

import React from "react";

import { cn } from "@repo/ui/lib/utils";

/**
 * The rule between two fields that only need one answer between them.
 *
 * It states the relationship without words, which is the point: a person
 * scanning the form reads "o" before they read any hint, and two stacked
 * inputs stop looking like two things to fill in. It turns destructive along
 * with the group's error, because the joint between the two fields is exactly
 * what failed when neither one was filled in.
 *
 * Decorative for assistive tech — the group's own hint and error carry the
 * same fact in words.
 */
export const EitherDivider = ({
  label = "o",
  invalid = false,
}: {
  label?: string;
  invalid?: boolean;
}) => (
  <div aria-hidden className="flex items-center gap-3 select-none">
    <span
      className={cn("h-px flex-1", invalid ? "bg-destructive/30" : "bg-border")}
    />
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] leading-normal font-medium",
        invalid
          ? "border-destructive/40 text-destructive"
          : "border-border text-muted-foreground",
      )}
    >
      {label}
    </span>
    <span
      className={cn("h-px flex-1", invalid ? "bg-destructive/30" : "bg-border")}
    />
  </div>
);

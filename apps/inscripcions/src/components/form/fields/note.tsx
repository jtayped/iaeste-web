"use client";

import type { RegistrationForm } from "@/lib/form-schema";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Textarea } from "@repo/ui/textarea";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_HINT, FIELD_LABEL } from "../field-styles";
import { EASE_OUT } from "../motion";

/**
 * Optional, and it looks optional: collapsed to a single quiet line so it
 * never reads as a seventh thing to fill in. The disclosure is hand-rolled
 * rather than the Radix collapsible because the shared tailwind config ships
 * no collapsible keyframes, so the height animation would not exist.
 */
const NoteField = ({ form }: { form: UseFormReturn<RegistrationForm> }) => {
  const [open, setOpen] = React.useState(false);
  const reduceMotion = useReducedMotion();
  const contentId = React.useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={contentId}
        className="group flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className="flex size-5 items-center justify-center rounded-full border border-input transition-colors group-hover:border-ring/40">
          <Plus
            className={cn(
              "size-3 transition-transform duration-200",
              open && "rotate-45",
            )}
          />
        </span>
        {open ? "amaga la nota" : "afegeix una nota (opcional)"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            key="note"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.24,
              ease: EASE_OUT,
            }}
            className="overflow-hidden"
          >
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="space-y-2 pt-4">
                  <FormLabel className={cn(FIELD_LABEL, "sr-only")}>
                    nota
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      data-field-name="note"
                      maxLength={2_000}
                      rows={3}
                      placeholder="alguna cosa que vulguis que sapiguem…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className={cn(FIELD_HINT, "font-medium")} />
                </FormItem>
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoteField;

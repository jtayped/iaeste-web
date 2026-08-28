"use client";

import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

/**
 * Toast host. Render once, near the root of the app.
 *
 * The upstream shadcn wrapper reads the active theme from `next-themes`; this
 * repo has no theme provider, so the toast surfaces are painted with the same
 * CSS variables as every other component and follow whatever `.dark` ancestor
 * the app sets.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error:
            "group-[.toaster]:border-destructive/50 group-[.toaster]:text-destructive",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

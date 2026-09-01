"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, History, TriangleAlert } from "lucide-react";

import { Button } from "@repo/ui/button";

import { childVariants } from "@/components/form/motion";
import type { Session } from "@/lib/registration-flow";

import { toSessionContext } from "./context";

export const MembershipStep = ({
  session,
  onContinue,
  onTryAnotherEmail,
}: {
  session: Session;
  onContinue: () => void;
  onTryAnotherEmail: () => void;
}) => {
  const [showMismatch, setShowMismatch] = React.useState(false);
  const email = toSessionContext(session).email;

  if (showMismatch) {
    return (
      <motion.section
        variants={childVariants}
        aria-live="polite"
        className="overflow-hidden rounded-xl border border-amber-500/30 bg-card shadow-sm"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <TriangleAlert aria-hidden className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">
                no hem trobat el teu perfil
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                no tenim dades vinculades a{" "}
                <span className="font-medium break-all text-foreground">
                  {email}
                </span>
                . si l&apos;any passat vas fer servir una altra adreça, prova-la
                abans de continuar.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t bg-amber-50/60 p-6 sm:grid-cols-2 sm:p-8">
          <Button className="h-11" onClick={onTryAnotherEmail}>
            <ArrowLeft aria-hidden />
            prova un altre correu
          </Button>
          <Button className="h-11" variant="outline" onClick={onContinue}>
            continua igualment
          </Button>
          <p className="text-xs leading-relaxed text-amber-900 sm:col-span-2">
            si continues, el formulari començarà amb les dades en blanc.
          </p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      variants={childVariants}
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <History aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">
              ja havies estat membre d&apos;iaeste lleida?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              si et reconeixem pel correu, les dades que ja tenim apareixeran al
              pas següent perquè només les hagis de revisar.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t bg-default/60 p-6 sm:grid-cols-2 sm:p-8">
        <Button
          className="h-11"
          onClick={() => (session.known ? onContinue() : setShowMismatch(true))}
        >
          sí, ja hi havia estat
        </Button>
        <Button className="h-11" variant="outline" onClick={onContinue}>
          no, és el primer any
        </Button>
      </div>
    </motion.section>
  );
};

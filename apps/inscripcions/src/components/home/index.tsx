"use client";
import { buttonVariants } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";
import { Check, RotateCw, Send } from "lucide-react";
import Link from "next/link";
import React from "react";
import { motion, MotionConfig } from "framer-motion";
import ButtonGroup from "@repo/ui/button-group";
import { Logo } from "@repo/ui/logo";
import { Globe } from "lucide-react";
import type { RegistrationAvailability } from "@/lib/registration-status";

// Shared with the form and the status screens so the three surfaces of this
// app enter the same way and set headings at the same scale.
import { childVariants, containerVariants } from "@/components/form/motion";

const HomePage = ({
  availability,
}: {
  availability: RegistrationAvailability;
}) => {
  const isOpen = availability === "open";
  const isUnavailable = availability === "unavailable";

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="flex min-h-dvh items-center py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="grid text-center">
          <motion.div variants={childVariants}>
            <Logo
              variant="icon"
              width={100}
              priority
              className="mx-auto mb-5 size-[100px]"
            />
          </motion.div>
          <motion.div variants={childVariants}>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {isOpen
                ? "inscriu-te a iaeste lleida!"
                : isUnavailable
                  ? "no podem comprovar les inscripcions"
                  : "el termini d'inscripció ha finalitzat"}
            </h1>
          </motion.div>
          <motion.div variants={childVariants}>
            <Paragraph className="mt-3 text-muted-foreground">
              {isOpen
                ? "només són dos minuts. omple el formulari i uneix-te al comitè!"
                : isUnavailable
                  ? "no hem pogut connectar amb el servidor. torna-ho a provar d'aquí a un moment."
                  : "contacta amb nosaltres per correu o visita el web."}
            </Paragraph>
          </motion.div>
          {/* Stacked and equal-width on a phone, a centred row from `sm` up.
              HeroUI's `.button` is `w-fit`, so without the `w-full` override
              the two actions size themselves to their own labels and sit
              ragged against the left of the stack. `sm:w-auto` hands the
              width back to the label once they are side by side. */}
          <motion.div variants={childVariants} className="mt-6">
            <ButtonGroup className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:w-auto">
              {isOpen ? (
                <Link
                  href="/formulari"
                  className={buttonVariants({ className: "md:px-12" })}
                >
                  <Check />
                  inscriu-te
                </Link>
              ) : isUnavailable ? (
                <Link
                  href="/"
                  className={buttonVariants({ className: "md:px-12" })}
                >
                  <RotateCw />
                  torna-ho a provar
                </Link>
              ) : (
                <Link
                  href="mailto:iaeste@udl.cat?subject=Inscripci%C3%B3%20a%20IAESTE%20Lleida"
                  className={buttonVariants({ className: "md:px-12" })}
                >
                  <Send />
                  contacta&apos;ns
                </Link>
              )}
              <Link
                href={"https://iaestelleida.cat"}
                className={buttonVariants({ variant: "outline" })}
              >
                <Globe /> més informació
              </Link>
            </ButtonGroup>
          </motion.div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
};

export default HomePage;

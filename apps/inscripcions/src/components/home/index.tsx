"use client";
import { Button } from "@repo/ui/button";
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
          <motion.div variants={childVariants} className="mx-auto mt-6">
            <ButtonGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex [&>*]:min-h-11">
              <Button asChild className="md:px-12">
                {isOpen ? (
                  <Link href="/formulari">
                    <Check />
                    inscriu-te
                  </Link>
                ) : isUnavailable ? (
                  <Link href="/">
                    <RotateCw />
                    torna-ho a provar
                  </Link>
                ) : (
                  <Link href="mailto:iaeste@udl.cat?subject=Inscripci%C3%B3%20a%20IAESTE%20Lleida">
                    <Send />
                    contacta&apos;ns
                  </Link>
                )}
              </Button>
              <Button variant="outline" asChild>
                <Link href={"https://iaestelleida.cat"}>
                  <Globe /> més informació
                </Link>
              </Button>
            </ButtonGroup>
          </motion.div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
};

export default HomePage;

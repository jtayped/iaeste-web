"use client";
import { Button } from "@repo/ui/button";
import { H1, Paragraph } from "@repo/ui/typography";
import { Check, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";
import ButtonGroup from "@repo/ui/button-group";
import { Globe } from "lucide-react";
import { env } from "@repo/env/inscripcions";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.4,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const HomePage = () => {
  return (
    <motion.div
      className="flex min-h-dvh items-center py-8"
      initial={false}
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="grid text-center">
        <motion.div variants={childVariants}>
          <Image
            src={"/logos/icon-lleida-blue.png"}
            width={100}
            height={100}
            alt="logo d'iaeste lc lleida"
            className="mx-auto mb-4"
          />
        </motion.div>
        <motion.div variants={childVariants}>
          <H1>
            {env.NEXT_PUBLIC_INSCRIPCIONS_STATE === "on"
              ? "inscriu-te a iaeste lleida!"
              : "el termini d'inscripció ha finalitzat"}
          </H1>
        </motion.div>
        <motion.div variants={childVariants}>
          <Paragraph className="mt-3">
            {env.NEXT_PUBLIC_INSCRIPCIONS_STATE === "on"
              ? "només són dos minuts. omple el formulari i uneix-te al comitè!"
              : "contacta amb nosaltres per correu o visita el web."}
          </Paragraph>
        </motion.div>
        <motion.div variants={childVariants} className="mx-auto mt-6">
          <ButtonGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex [&>*]:min-h-11">
            <Button asChild className="md:px-12">
              {env.NEXT_PUBLIC_INSCRIPCIONS_STATE === "on" ? (
                <Link href="/formulari">
                  <Check />
                  inscriu-te
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
  );
};

export default HomePage;

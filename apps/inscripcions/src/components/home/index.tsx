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

const HomePage = ({ state }: { state: "on" | "off" }) => {
  return (
    <motion.div
      className="h-screen flex items-center"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="grid text-center">
        <motion.div variants={childVariants}>
          <Image
            src={"/logos/icon-lleida-blue.png"}
            width={100}
            height={100}
            alt="Logo de IAESTE LC Lleida"
            className="mx-auto mb-4"
          />
        </motion.div>
        <motion.div variants={childVariants}>
          <H1>
            {state === "on"
              ? "Inscriu-te a IAESTE Lleida!"
              : "Ha finalitzat el plaç per inscriure't a IAESTE :("}
          </H1>
        </motion.div>
        <motion.div variants={childVariants}>
          <Paragraph className="mt-3">
            {state === "on"
              ? "Només son 2 minuts per inscriure’t. Omple el formulari i uneix-te a nosaltres!"
              : "Contacta amb nosaltres per correu o visita la nostra web!"}
          </Paragraph>
        </motion.div>
        <motion.div variants={childVariants} className="mt-6 mx-auto">
          <ButtonGroup className="grid grid-cols-2 md:flex">
            <Button asChild className="md:px-12">
              {state == "on" ? (
                <Link href="/formulari">
                  <Check />
                  Inscriu-te
                </Link>
              ) : (
                <Link href="mailto:iaeste@udl.cat?subject=Inscripci%C3%B3%20a%20IAESTE%20Lleida">
                  <Send />
                  Contacta&apos;ns
                </Link>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href={"https://iaestelleida.cat"}>
                <Globe /> Més informació
              </Link>
            </Button>
          </ButtonGroup>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default HomePage;

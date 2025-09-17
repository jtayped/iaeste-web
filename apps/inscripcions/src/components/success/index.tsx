"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import { ArrowRight, UserCheck } from "lucide-react";
import { H1, Paragraph } from "@repo/ui/typography";
import { useSearchParams } from "next/navigation";
import { ALREADY_SUBMITTED } from "@/constants/errors";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@repo/ui/button";
import Link from "next/link";

const SuccessPageComponent = () => {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") ?? "";
  const alreadySubmitted = searchParams.get("error") === ALREADY_SUBMITTED;

  const [showConfetti, setShowConfetti] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Show confetti once (on mount)
    setShowConfetti(true);

    // Set sizes for the confetti canvas
    setDimensions({ width: window.innerWidth, height: window.innerHeight });

    // Stop confetti after a timeout to not be too much
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000); // 5 seconds of confetti

    return () => clearTimeout(timer);
  }, []);

  const iconVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { stiffness: 200, damping: 20, delay: 0.2 },
    },
  };

  const textVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: 0.4 + i * 0.2, duration: 0.6 },
    }),
  };

  return (
    <div className="h-screen flex items-center justify-center">
      {showConfetti && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={200}
          recycle={false}
          gravity={0.3}
        />
      )}

      <div className="text-center px-4">
        <motion.div variants={iconVariants} initial="hidden" animate="visible">
          <UserCheck className="text-primary mx-auto mb-6" size={120} />
        </motion.div>

        <motion.div
          custom={0}
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <H1>{name ? `Moltes gràcies, ${name}!` : "Moltes gràcies!"}</H1>
        </motion.div>

        <motion.div
          custom={1}
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <Paragraph className="mt-4">
            Hem rebut la teva inscripció i ens posarem en contacte amb tu! :)
          </Paragraph>
        </motion.div>
        <motion.div
          custom={1}
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <Button asChild className="mt-6 group">
            <Link href={"https://iaestelleida.cat"}>
              Visita la nostra web
              <ArrowRight className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </motion.div>
        {alreadySubmitted && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircleIcon />
            <AlertTitle>Ja estás inscrit</AlertTitle>
            <AlertDescription>Només et pots inscriure un cop!</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default SuccessPageComponent;

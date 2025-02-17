"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import reasons from "@/constants/why-iaeste";
import { type Reason } from "@/types/why-iaeste";
import { Card } from "../ui/card";
import { H3, Paragraph } from "../ui/typography";
import { useTranslations } from "next-intl";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Reason = ({
  reason,
  className = "",
}: {
  reason: Reason;
  className?: string;
}) => {
  const t = useTranslations("StudentsPage.why-iaeste.reasons");

  return (
    <Card
      className={cn(
        "h-[320px] md:h-[250px] flex flex-col md:flex-row gap-6",
        className
      )}
    >
      <div className="bg-primary p-4 md:h-full shadow">
        <reason.icon className="text-primary-foreground" size={60} />
      </div>
      <div>
        <H3 className="mt-0">{t(`${reason.key}.title`)}</H3>
        <Paragraph className="text-muted-foreground">
          {t(`${reason.key}.description`)}
        </Paragraph>
      </div>
    </Card>
  );
};

const Reasons = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Automatically cycle through reasons
  useEffect(() => {
    if (isHovered) return; // Pause timer when hovered

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % reasons.length);
    }, 5000); // Change reason every 5 seconds

    return () => clearInterval(interval);
  }, [isHovered]);

  // Handle next and previous actions
  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % reasons.length);
  };

  const goToPrevious = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + reasons.length) % reasons.length
    );
  };

  // Handle button click
  const goToReason = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div
      className="w-full overflow-x-hidden relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Reason Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={reasons[currentIndex].key}
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.15 }}
        >
          <Reason reason={reasons[currentIndex]} />
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between items-center gap-5 mt-4">
        <Button size="icon" variant="ghost" onClick={goToPrevious}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex justify-center gap-2">
          {reasons.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => goToReason(index)}
              className={`h-2 rounded-full relative overflow-hidden ${
                currentIndex === index ? "bg-primary" : "bg-primary/50"
              }`}
              style={{ width: 40 }}
              animate={currentIndex === index ? { width: 75 } : { width: 50 }}
            />
          ))}
        </div>
        <Button size="icon" variant="ghost" onClick={goToNext}>
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Reasons;

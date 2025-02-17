"use client";
import { Card } from "@/components/ui/card";
import outgoings from "@/constants/outgoings";
import { type Outgoing } from "@/types/outgoing";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React, { useRef, useState, useEffect } from "react";

const SCROLL_VELOCITY = 50;

const Outgoings = () => {
  const t = useTranslations("outgoings");
  const baseX = useMotionValue(0);
  const ulRef = useRef<HTMLUListElement>(null);
  const items = [...outgoings, ...outgoings];
  const [isDragging, setIsDragging] = useState(false);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  // Calculate dimensions and constraints
  useEffect(() => {
    const updateDimensions = () => {
      if (ulRef.current) {
        // Calculate content width (original items only)
        const children = Array.from(ulRef.current.children);
        const originalItems = children.slice(0, children.length / 2);
        const width = originalItems.reduce(
          (acc, child) => acc + child.getBoundingClientRect().width + 20,
          0
        );
        setContentWidth(width);

        // Get container width
        const container = ulRef.current.parentElement;
        if (container) {
          setContainerWidth(container.getBoundingClientRect().width);
        }
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Update drag constraints when dimensions change
  useEffect(() => {
    if (contentWidth > 0 && containerWidth > 0) {
      const maxScroll = Math.max(contentWidth - containerWidth, 0);
      setConstraints({ left: -maxScroll, right: 0 });
    }
  }, [contentWidth, containerWidth]);

  // Handle automatic scrolling
  useAnimationFrame((t, delta) => {
    if (isDragging) return;

    let newX = baseX.get() - SCROLL_VELOCITY * (delta / 1000);

    // Wrap around when exceeding content width
    if (contentWidth > 0 && newX <= -contentWidth) {
      newX += contentWidth;
    }

    baseX.set(newX);
  });

  const Outgoing = ({ outgoing }: { outgoing: Outgoing }) => (
    <Card className="w-[200px] md:w-[450px] h-[300px] md:h-[150px] flex flex-col md:flex-row gap-6 p-4">
      <Image
        src={outgoing.image}
        alt={`${outgoing.name}'s internship`}
        width={300}
        height={400}
        className="object-cover h-[100px] md:h-full w-full md:w-[150px] shadow"
      />
      <article className="h-full md:h-auto flex flex-col justify-between">
        <div>
          <p className="text-xl">&quot;{t(`${outgoing.key}.quote`)}&quot;</p>
        </div>
        <div className="flex justify-end">
          <p className="text-sm">- {outgoing.name}</p>
        </div>
      </article>
    </Card>
  );

  return (
    <div className="overflow-x-hidden relative">
      <motion.ul
        ref={ulRef}
        className="flex gap-5"
        style={{ x: baseX }}
        drag="x"
        dragConstraints={constraints}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
      >
        {items.map((o, index) => (
          <li key={`${o.key}-${index}`}>
            <Outgoing outgoing={o} />
          </li>
        ))}
      </motion.ul>
    </div>
  );
};

export default Outgoings;

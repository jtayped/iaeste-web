"use client";
import { Card } from "@/components/ui/card";
import outgoings from "@/constants/outgoings";
import { type Outgoing } from "@/types/outgoing";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React, { useRef } from "react";

const SCROLL_VELOCITY = 50;

const Outgoings = () => {
  const t = useTranslations("outgoings");

  const Outgoing = ({ outgoing }: { outgoing: Outgoing }) => {
    return (
      <Card className="w-[200px] md:w-[450px] h-[300px] md:h-[150px] flex flex-col md:flex-row gap-6 p-4">
        <Image
          src={outgoing.image}
          alt={`${outgoing.name}'s internship`}
          width={300}
          height={400}
          className="object-cover h-[100px] md:h-full w-full md:w-[150px] shadow"
        />
        <article className="h-full md:h-auto flex flex-col justify-between">
          <div className="">
            <p className="text-xl">&quot;{t(`${outgoing.key}.quote`)}&quot;</p>
          </div>
          <div className="flex justify-end">
            <p className="text-sm">- {outgoing.name}</p>
          </div>
        </article>
      </Card>
    );
  };

  const baseX = useMotionValue(0);
  const ulRef = useRef<HTMLUListElement>(null);
  const items = [...outgoings, ...outgoings]; // Duplicate the items

  useAnimationFrame((t, delta) => {
    const moveBy = SCROLL_VELOCITY * (delta / 1000);
    baseX.set(baseX.get() - moveBy);

    // Check if the first item is out of view
    if (ulRef.current) {
      const firstItem = ulRef.current.children[0];
      const firstItemRect = firstItem.getBoundingClientRect();
      if (firstItemRect.right < 0) {
        // Move the first item to the end of the list
        ulRef.current.appendChild(firstItem);
        baseX.set(baseX.get() + firstItemRect.width + 20); // Adjust for gap
      }
    }
  });

  return (
    <div className="overflow-x-hidden">
      <motion.ul ref={ulRef} className="flex gap-5" style={{ x: baseX }}>
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

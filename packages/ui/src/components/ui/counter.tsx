"use client";

import {
  type KeyframeOptions,
  animate,
  useInView,
  useIsomorphicLayoutEffect,
} from "framer-motion";
import { useRef } from "react";

interface AnimatedCounterProps {
  from: number;
  to: number;
  duration: number;
  animationOptions?: KeyframeOptions;
  /** BCP-47 tag for the thousands separator. Defaults to the document's. */
  locale?: string;
}

const AnimatedCounter = ({
  to,
  from = 0,
  duration = 3,
  animationOptions,
  locale,
}: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  // Six figures without a separator is a string of digits, not a number:
  // `374000` reads as nothing at a glance where `374.000` reads instantly.
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;

    if (!element) return;
    if (!inView) return;

    // Set initial value
    element.textContent = format(from);

    // If reduced motion is enabled in system's preferences
    if (window.matchMedia("(prefers-reduced-motion)").matches) {
      element.textContent = format(to);
      return;
    }

    const controls = animate(from, to, {
      duration,
      ease: [0, 0.5, 0.9, 1],
      ...animationOptions,
      onUpdate(value) {
        element.textContent = format(value);
      },
    });

    // Cancel on unmount
    return () => {
      controls.stop();
    };
  }, [ref, inView, from, to, locale]);

  return <span ref={ref} />;
};

export default AnimatedCounter;

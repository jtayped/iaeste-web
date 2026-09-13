import { Globe, Handshake, Repeat, type LucideIcon } from "lucide-react";

export type Step = { key: string; icon: LucideIcon };

/**
 * lucide, not `react-icons/fa6`. These three solid FontAwesome glyphs sat in a
 * band directly between two sections of 1.5px lucide strokes, which is two icon
 * weights on one screen. `react-icons` stays for the brand marks in
 * `socials.ts`, where there is no lucide equivalent.
 */
const steps: Step[] = [
  { key: "internship", icon: Handshake },
  /* "sistema de doble plaça" — a reciprocal swap, not a crowd. */
  { key: "auction", icon: Repeat },
  { key: "exchange", icon: Globe },
];

export default steps;

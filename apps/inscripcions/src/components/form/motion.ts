import type { Variants } from "framer-motion";

/**
 * Motion for the registration form.
 *
 * This is an Operate surface: the visitor came to finish a task, so nothing
 * here may make them wait. The whole entrance resolves in under half a
 * second, and the stagger is capped so the last section is never noticeably
 * later than the first — the old version staggered eight cards at 0.15s each,
 * which is where the "laggy" feeling came from.
 *
 * Movement is dropped under `prefers-reduced-motion` via `<MotionConfig
 * reducedMotion="user">` in the form root; opacity and state feedback survive,
 * because a disappearing error summary is information loss, not decoration.
 */

/** Confident deceleration — arrives quickly, settles softly, never bounces. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0.04, staggerChildren: 0.06 },
  },
};

export const childVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

/** Notices that appear and disappear inside an already-settled page. */
export const noticeVariants: Variants = {
  hidden: { opacity: 0, y: -6, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: "auto",
    transition: { duration: 0.28, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.18, ease: EASE_OUT },
  },
};

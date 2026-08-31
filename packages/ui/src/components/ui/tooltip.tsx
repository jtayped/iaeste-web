"use client";

import * as React from "react";
import { Focusable } from "react-aria-components/Focusable";
import {
  TooltipContent as HeroUITooltipContent,
  TooltipRoot as HeroUITooltipRoot,
  type TooltipContentProps as HeroUITooltipContentProps,
  type TooltipRootProps as HeroUITooltipRootProps,
} from "@heroui/react/tooltip";

export interface TooltipProps extends HeroUITooltipRootProps {
  /** Suppresses the tooltip without unmounting it. */
  isDisabled?: boolean;
}

/**
 * `Tooltip` is the root *and* the trigger's scope: React Aria puts the trigger
 * props on a context that the focusable child reads, so the button goes
 * directly inside, with the content beside it.
 *
 * ```tsx
 * <Tooltip>
 *   <Button size="icon" aria-label="avisos" />
 *   <TooltipContent placement="bottom">rep un avís…</TooltipContent>
 * </Tooltip>
 * ```
 *
 * `delay` is 0 rather than React Aria's 1500ms. Every tooltip here labels an
 * icon-only control — a collapsed sidebar item, the notifications bell — where
 * the tooltip *is* the name of the thing. Waiting a second and a half to learn
 * what a button does is the wrong trade for a control with no visible label.
 */
const Tooltip = ({ delay = 0, ...props }: TooltipProps) => (
  <HeroUITooltipRoot delay={delay} {...props} />
);
Tooltip.displayName = "Tooltip";

/**
 * Only needed when the trigger is not already a React Aria control.
 *
 * `Button` and the other HeroUI-backed controls pick up the trigger props from
 * context on their own, so they go straight inside `Tooltip`. This wraps the
 * ones that cannot — the sidebar's menu button, which is a plain `<button>` or
 * a `next/link` behind a `Slot` — and hands them the same props by cloning.
 * The child must forward its ref and spread what it is given.
 */
const TooltipTrigger = Focusable;

export type TooltipContentProps = HeroUITooltipContentProps;

const TooltipContent = HeroUITooltipContent;

export { Tooltip, TooltipTrigger, TooltipContent };

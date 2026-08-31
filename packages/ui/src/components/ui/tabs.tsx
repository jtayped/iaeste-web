"use client";

import * as React from "react";
import {
  Tab as HeroUITab,
  TabIndicator as HeroUITabIndicator,
  TabList as HeroUITabList,
  TabListContainer as HeroUITabListContainer,
  TabPanel as HeroUITabPanel,
  TabsRoot as HeroUITabsRoot,
  type TabListContainerProps as HeroUITabListContainerProps,
  type TabPanelProps as HeroUITabPanelProps,
  type TabProps as HeroUITabProps,
  type TabsRootProps as HeroUITabsRootProps,
} from "@heroui/react/tabs";

import { cn } from "@repo/ui/lib/utils";

export interface TabsProps extends Omit<
  HeroUITabsRootProps,
  "selectedKey" | "defaultSelectedKey" | "onSelectionChange"
> {
  /**
   * React Aria calls these `selectedKey` / `onSelectionChange` and types them
   * `Key`. Every tab set here is keyed by a plain string, so the conversion
   * happens once, here.
   */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value, defaultValue, onValueChange, ...props }, ref) => (
    <HeroUITabsRoot
      ref={ref}
      selectedKey={value}
      defaultSelectedKey={defaultValue}
      onSelectionChange={(key) => onValueChange?.(String(key))}
      {...props}
    />
  ),
);
Tabs.displayName = "Tabs";

export interface TabsListProps extends HeroUITabListContainerProps {
  "aria-label"?: string;
}

/**
 * The track the tabs sit in. React Aria splits it in two — a container that
 * draws the track and scrolls, and the tab list itself — but nothing here ever
 * wants one without the other, and the container is what gives a list too wide
 * for a phone its own horizontal scroll with edge chevrons, instead of pushing
 * the page sideways.
 */
const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, "aria-label": ariaLabel, ...props }, ref) => (
    <HeroUITabListContainer ref={ref} className={className} {...props}>
      <HeroUITabList aria-label={ariaLabel}>{children}</HeroUITabList>
    </HeroUITabListContainer>
  ),
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends Omit<
  HeroUITabProps,
  "id" | "children"
> {
  value: string;
  children?: React.ReactNode;
  /** Native alias for HeroUI's `isDisabled`. */
  disabled?: boolean;
}

/**
 * `TabIndicator` is the sliding pill, and it lives inside the tab rather than
 * beside it: React Aria positions it against whichever tab is selected and
 * animates it across. HeroUI's own height is 32px; 36px is the touch target
 * the admin's filters were built at.
 */
const TabsTrigger = React.forwardRef<HTMLDivElement, TabsTriggerProps>(
  ({ value, className, disabled, isDisabled, children, ...props }, ref) => (
    <HeroUITab
      ref={ref}
      id={value}
      isDisabled={isDisabled ?? disabled}
      className={cn("h-9", className)}
      {...props}
    >
      {children}
      <HeroUITabIndicator />
    </HeroUITab>
  ),
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends Omit<HeroUITabPanelProps, "id"> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, ...props }, ref) => (
    <HeroUITabPanel ref={ref} id={value} {...props} />
  ),
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };

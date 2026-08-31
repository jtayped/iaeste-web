"use client";

import * as React from "react";
import {
  BreadcrumbsItem as HeroUIBreadcrumbsItem,
  BreadcrumbsRoot as HeroUIBreadcrumbsRoot,
  type BreadcrumbsItemProps as HeroUIBreadcrumbsItemProps,
  type BreadcrumbsRootProps as HeroUIBreadcrumbsRootProps,
} from "@heroui/react/breadcrumbs";

/**
 * The trail is a React Aria collection now, which is why the old
 * `BreadcrumbLink` / `BreadcrumbPage` / `BreadcrumbSeparator` triple is gone.
 *
 * React Aria builds the `<ol>` from its item nodes and will not accept
 * arbitrary `<li>`s between them, so a separator could not stay a component
 * the caller places. It does not need to: the collection knows which crumb is
 * last, and that one alone gets `aria-current="page"`, loses its separator,
 * and renders as a `<span>` rather than a link to the page you are already on
 * — the three things the caller used to spell out by hand.
 *
 * A crumb with an `href` needs `@repo/ui/router-provider` mounted above it, or
 * pressing it is a full document load instead of a client transition.
 */

export interface BreadcrumbProps extends HeroUIBreadcrumbsRootProps {
  /** Labels the landmark and the list it wraps. */
  "aria-label"?: string;
}

const Breadcrumb = React.forwardRef<HTMLOListElement, BreadcrumbProps>(
  ({ "aria-label": ariaLabel = "breadcrumb", ...props }, ref) => (
    // React Aria labels the `<ol>` but adds no landmark, and a breadcrumb
    // trail is one of the few navigations worth jumping to directly.
    <nav aria-label={ariaLabel}>
      <HeroUIBreadcrumbsRoot ref={ref} aria-label={ariaLabel} {...props} />
    </nav>
  ),
);
Breadcrumb.displayName = "Breadcrumb";

export type BreadcrumbItemProps = HeroUIBreadcrumbsItemProps &
  React.ComponentProps<typeof HeroUIBreadcrumbsItem>;

const BreadcrumbItem = HeroUIBreadcrumbsItem;

export { Breadcrumb, BreadcrumbItem };

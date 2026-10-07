"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@repo/ui/lib/utils";

const PageActionsContext = React.createContext<{
  slot: HTMLElement | null;
  setSlot: (node: HTMLElement | null) => void;
} | null>(null);

/** Scopes one page's header-action slot to that page's own content. */
export function PageActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  const value = React.useMemo(() => ({ slot, setSlot }), [slot]);

  return (
    <PageActionsContext.Provider value={value}>
      {children}
    </PageActionsContext.Provider>
  );
}

/**
 * Every action is an equal share of the row on a phone, 44px tall, and back
 * to its own width and the compact control height once there is a pointer.
 * Applied to the row and to the slot, because a portalled action is a child of
 * the slot, not of the row.
 */
const ACTION_ITEMS_CLASS = "*:min-h-11 max-sm:*:flex-1 sm:*:min-h-9";

/**
 * The header's action row: the slot that `<PageAction>` fills, then the
 * page's own `actions`. The slot comes first because what lands in it acts on
 * the list below the header, and a page's own action, such as "convida algú",
 * is the primary one and ends the row.
 *
 * The row is hidden until something in it has content, so a page with no
 * actions does not leave a gap under its title on a phone. Beside the title it
 * keeps its width and the description wraps instead, so two actions never
 * split onto two lines.
 */
export function PageActionsRow({ children }: { children?: React.ReactNode }) {
  const context = React.useContext(PageActionsContext);

  return (
    <div
      className={cn(
        "hidden flex-wrap items-center gap-2 has-[>:not(:empty)]:flex sm:shrink-0",
        ACTION_ITEMS_CLASS,
      )}
    >
      {/* `contents`, so what is portalled here lays out as the row's own
          flex item. A box of its own would start the share from zero while
          a button starts from its padding, and the halves would differ. */}
      <div
        ref={context?.setSlot}
        className={cn("contents", ACTION_ITEMS_CLASS)}
      />
      {children}
    </div>
  );
}

/**
 * Draws its children in the header of the enclosing `<PageShell>`, beside the
 * title. For an action that belongs to the whole page but needs state only a
 * client component deeper in it has, such as a table's current query.
 * Outside a `<PageShell>` it draws nothing.
 */
export function PageAction({ children }: { children: React.ReactNode }) {
  const slot = React.useContext(PageActionsContext)?.slot;
  return slot ? createPortal(children, slot) : null;
}

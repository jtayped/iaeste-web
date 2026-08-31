"use client";

import * as React from "react";
import {
  SelectIndicator as HeroUISelectIndicator,
  SelectPopover as HeroUISelectPopover,
  SelectRoot as HeroUISelectRoot,
  type SelectRootProps as HeroUISelectRootProps,
  SelectTrigger as HeroUISelectTrigger,
  type SelectTriggerProps as HeroUISelectTriggerProps,
  SelectValue as HeroUISelectValue,
  type SelectValueProps as HeroUISelectValueProps,
} from "@heroui/react/select";
import {
  ListBoxItemIndicator as HeroUIListBoxItemIndicator,
  ListBoxItemRoot as HeroUIListBoxItem,
  type ListBoxItemRootProps as HeroUIListBoxItemProps,
} from "@heroui/react/list-box-item";
import { ListBoxRoot as HeroUIListBox } from "@heroui/react/list-box";

/**
 * Radix read the trigger's disabled/checked state off the DOM automatically;
 * React Aria threads it through explicit props instead, so every wrapper below
 * takes the legacy Radix prop name and forwards HeroUI's own name in one
 * place, the way `button.tsx` does for `disabled`/`isDisabled`.
 */

export interface SelectValueProps extends Omit<
  HeroUISelectValueProps,
  "className" | "children"
> {
  className?: string;
  placeholder?: string;
}

/**
 * Radix's `Select.Value` took its own `placeholder`. React Aria's puts it on
 * the root instead and has `Select.Value` fall back to a localised English
 * string ("Select an item") when nothing is selected and no placeholder was
 * given — wrong for a Catalan admin panel. Rendering the selected text or the
 * placeholder by hand here avoids both problems without moving the prop.
 */
const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => (
    <HeroUISelectValue ref={ref} className={className} {...props}>
      {({ isPlaceholder, selectedText }) =>
        isPlaceholder ? placeholder : selectedText
      }
    </HeroUISelectValue>
  ),
);
SelectValue.displayName = "SelectValue";

/**
 * How the trigger tells the root which `<label>` names it.
 *
 * The admin labels its selects the plain-HTML way — a sibling `<label
 * htmlFor>` pointing at the trigger's id — which is enough for a native
 * `<select>` but not for this one. A `<button>` takes no part in `for`/`id`
 * naming, so the browser exposes an unnamed combobox and React Aria warns
 * that a Select with no visible label needs `aria-label`. The trigger reports
 * its id up, the root finds the label that points at it and hands React Aria
 * the `aria-labelledby` it was asking for.
 */
const SelectTriggerIdContext = React.createContext<
  ((triggerId: string | undefined) => void) | null
>(null);

export interface SelectProps extends Omit<
  HeroUISelectRootProps<object>,
  | "className"
  | "children"
  | "selectedKey"
  | "defaultSelectedKey"
  | "onSelectionChange"
  | "placeholder"
> {
  className?: string;
  children?: React.ReactNode;
  /**
   * Radix's `value`/`onValueChange` spoke plain strings; React Aria's
   * `selectedKey`/`onSelectionChange` speak `Key` (`string | number`). Every
   * consumer only ever uses string ids, so the `Key` conversion is done once
   * here instead of at each of the four call sites.
   */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Native alias for HeroUI's `isDisabled`. */
  disabled?: boolean;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      disabled,
      isDisabled,
      children,
      ...props
    },
    ref,
  ) => {
    const [labelId, setLabelId] = React.useState<string>();

    const registerTriggerId = React.useCallback(
      (triggerId: string | undefined) => {
        const label =
          triggerId === undefined
            ? null
            : document.querySelector<HTMLLabelElement>(
                `label[for="${CSS.escape(triggerId)}"]`,
              );

        if (label === null) {
          setLabelId(undefined);
          return;
        }

        // A label written for a native control has no id of its own — it did
        // not need one. `aria-labelledby` does.
        if (label.id === "") label.id = `${triggerId}-label`;
        setLabelId(label.id);
      },
      [],
    );

    // An explicit name from the caller always wins; the label lookup is only
    // there for the selects that have no name at all.
    const named =
      props["aria-label"] !== undefined ||
      props["aria-labelledby"] !== undefined;

    return (
      <SelectTriggerIdContext.Provider value={registerTriggerId}>
        <HeroUISelectRoot
          ref={ref}
          className={className}
          isDisabled={isDisabled ?? disabled}
          selectedKey={value}
          defaultSelectedKey={defaultValue}
          onSelectionChange={(key) => {
            if (key !== null) onValueChange?.(String(key));
          }}
          {...props}
          {...(named ? {} : { "aria-labelledby": labelId })}
        >
          {children}
        </HeroUISelectRoot>
      </SelectTriggerIdContext.Provider>
    );
  },
);
Select.displayName = "Select";

export interface SelectTriggerProps extends Omit<
  HeroUISelectTriggerProps,
  "className" | "children"
> {
  className?: string;
  children?: React.ReactNode;
}

/**
 * The chevron was part of Radix's trigger internals (`SelectPrimitive.Icon`);
 * HeroUI's is its own sibling element, `Select.Indicator`, so it is added
 * here rather than left for every consumer to render.
 */
const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, id, ...props }, ref) => {
    const registerTriggerId = React.useContext(SelectTriggerIdContext);

    React.useEffect(() => {
      registerTriggerId?.(id);
    }, [registerTriggerId, id]);

    return (
      <HeroUISelectTrigger ref={ref} id={id} className={className} {...props}>
        {children}
        <HeroUISelectIndicator />
      </HeroUISelectTrigger>
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

export interface SelectContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof HeroUIListBox>,
  "className"
> {
  className?: string;
}

/**
 * Radix's `Content` was both the popover surface and the option list in one
 * node. React Aria splits them: `Select.Popover` positions and scrolls,
 * `ListBox` owns the options. React Aria wires the two together through
 * context the same way `Select.Trigger`/`Select.Value` do, so nesting them
 * here is enough — no props need passing by hand.
 */
const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => (
    <HeroUISelectPopover className={className}>
      <HeroUIListBox ref={ref} {...props}>
        {children}
      </HeroUIListBox>
    </HeroUISelectPopover>
  ),
);
SelectContent.displayName = "SelectContent";

export interface SelectItemProps extends Omit<
  HeroUIListBoxItemProps,
  "id" | "value" | "className" | "children"
> {
  value: string;
  className?: string;
  children?: React.ReactNode;
  /** Native alias for HeroUI's `isDisabled`. */
  disabled?: boolean;
}

/**
 * React Aria identifies an option by `id`, not `value` (that name is reserved
 * for a dynamic collection's backing data), so the Radix-spelled `value` prop
 * is remapped here. `textValue` also has to be supplied explicitly: React
 * Aria only derives it automatically from a single plain-text child, and the
 * campaign options render two ("<label> · actual"), which would otherwise
 * drop type-ahead silently.
 */
const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  (
    { value, className, disabled, isDisabled, textValue, children, ...props },
    ref,
  ) => (
    <HeroUIListBoxItem
      ref={ref}
      id={value}
      isDisabled={isDisabled ?? disabled}
      textValue={textValue ?? textValueOf(children)}
      className={className}
      {...props}
    >
      {children}
      <HeroUIListBoxItemIndicator />
    </HeroUIListBoxItem>
  ),
);
SelectItem.displayName = "SelectItem";

function textValueOf(node: React.ReactNode): string | undefined {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    const joined = node.map(textValueOf).filter(Boolean).join("");
    return joined.length > 0 ? joined : undefined;
  }
  return undefined;
}

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };

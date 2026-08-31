"use client";

import * as React from "react";
import {
  Toast,
  toast as heroUIToast,
  type ToastProviderProps,
} from "@heroui/react/toast";

export type ToasterProps = ToastProviderProps;

/**
 * Toast host. Render once, near the root of the app — it is the region the
 * toasts appear in, not a provider the app has to sit inside.
 *
 * The surfaces are painted with the same CSS variables as every other
 * component, so they follow whatever `.dark` ancestor the app sets without a
 * theme provider to read.
 */
const Toaster = ({ placement = "bottom end", ...props }: ToasterProps) => (
  <Toast.Provider placement={placement} {...props} />
);
Toaster.displayName = "Toaster";

/** HeroUI does not export the options type, so it is read off the call. */
export type ToastOptions = NonNullable<Parameters<typeof heroUIToast>[1]>;

/**
 * The imperative API, `sonner`'s shape over HeroUI's queue.
 *
 * The one rename: HeroUI calls the red one `danger`, after the variant that
 * paints it. A call site does not have a colour, it has an error — every one
 * of them is in a mutation's `onError` — so it stays `error` here.
 */
const toast = Object.assign(
  (message: React.ReactNode, options?: ToastOptions) =>
    heroUIToast(message, options),
  {
    success: heroUIToast.success,
    error: heroUIToast.danger,
    info: heroUIToast.info,
    warning: heroUIToast.warning,
    promise: heroUIToast.promise,
    /** Dismiss one toast by the key its call returned, or every one of them. */
    close: heroUIToast.close,
    clear: heroUIToast.clear,
  },
);

export { Toaster, toast };

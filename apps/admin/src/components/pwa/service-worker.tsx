"use client";

import * as React from "react";

import { isPushSupported, SERVICE_WORKER_URL } from "@/lib/push";

/**
 * Registers `public/sw.js` once the page has finished loading.
 *
 * After `load`, not during hydration: registration competes with the first
 * paint's own network work, and nothing on screen depends on it. The worker's
 * only job is push, which cannot happen until someone clicks the toggle
 * anyway.
 *
 * A registration failure is deliberately not surfaced to the user — there is
 * nothing they could do about it, and the only feature it costs them is the
 * one whose toggle reports its own errors.
 */
export function ServiceWorker() {
  React.useEffect(() => {
    if (!isPushSupported()) return;

    let cancelled = false;

    const register = () => {
      if (cancelled) return;
      void navigator.serviceWorker.register(SERVICE_WORKER_URL, {
        scope: "/",
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}

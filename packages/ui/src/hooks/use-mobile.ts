"use client";

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * `true` once the viewport is narrower than the `md` breakpoint.
 *
 * Undefined on the first render so the server and the client agree; callers
 * coerce with `!!isMobile` and get the desktop layout until hydration.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, []);

  return !!isMobile;
}

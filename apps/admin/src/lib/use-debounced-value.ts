"use client";

import * as React from "react";

/**
 * The value, held back until it has stopped changing for `delay` ms.
 *
 * The members search box is bound to state directly so typing stays instant,
 * and only this delayed copy reaches the query key — otherwise every keystroke
 * is a request, and the answers come back out of order.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

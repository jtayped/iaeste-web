import React from "react";

/**
 * Same workaround as `apps/api/src/lib/react-global.ts` — see that file's
 * doc comment for the full explanation. `packages/auth` runs under `tsx`
 * (dev/test) too, and calls `@repo/email`'s `SignInMagicLink({...})`
 * template function directly (not through a bundler that rewrites JSX
 * across `node_modules`), so it needs the same global `React` shim before
 * that call.
 */
(globalThis as unknown as { React: typeof React }).React = React;

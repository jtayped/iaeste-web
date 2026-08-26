import React from "react";

/**
 * `@repo/email`'s templates are plain `.tsx` source, imported straight from
 * `@repo/email/*` (a workspace package resolved through the node_modules
 * symlink) rather than a pre-built package — that's fine for `apps/web`,
 * which is bundled by Next.js and transforms its whole dependency graph
 * uniformly (automatic JSX runtime everywhere). `apps/api` instead runs
 * under `tsx` (dev/test) and `tsup` (build), both esbuild-based; esbuild's
 * default TypeScript loader does not apply a package's own tsconfig `jsx`
 * setting to files reached through a `node_modules` resolution path, and
 * falls back to the classic transform (`React.createElement(...)`), which
 * needs `React` as a global rather than an implicit `react/jsx-runtime`
 * import. Importing this module (for its side effect) before calling any
 * `@repo/email` template function works around that without touching
 * `@repo/email`'s own build setup.
 */
(globalThis as unknown as { React: typeof React }).React = React;

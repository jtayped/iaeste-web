import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/server.ts", "src/migrate.ts"],
  external: ["pg"],
  format: ["esm"],
  noExternal: [/^@repo\//],
  outDir: "dist",
  platform: "node",
  target: "node22",
  // `@repo/email` bundles `@react-email/*`, whose CJS internals call
  // `require("react")`. esbuild leaves that as a dynamic require, which throws
  // "Dynamic require of react is not supported" in the ESM output. Give the
  // bundle a real `require` so those calls resolve from node_modules.
  banner: {
    js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
  },
});

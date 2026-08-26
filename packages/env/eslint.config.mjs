import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    // Plain Node scripts (not type-checked, so `no-undef` needs the Node
    // globals spelled out) — everything else here is TypeScript, which
    // typescript-eslint already covers.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
      },
    },
  },
];

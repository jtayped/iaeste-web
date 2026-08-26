import { config, dbBoundaryRules } from "@repo/eslint-config/base";

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
  {
    // Read by browser-facing apps for their own env access. See base.js's
    // comment on dbBoundaryRules for why this can't just live in base.js's
    // own config.
    rules: dbBoundaryRules,
  },
];

import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    // Payload generates these; never hand-edited, never linted.
    ignores: [
      "src/payload-types.ts",
      "src/app/(payload)/admin/importMap.js",
      "src/migrations/**",
    ],
  },
];

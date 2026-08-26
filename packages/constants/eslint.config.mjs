import { config, dbBoundaryRules } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    // Pure domain data and Zod schemas, imported by every app. It must never
    // grow a server-only dependency on @repo/db. See base.js's comment on
    // dbBoundaryRules for why this can't just live in base.js's own config.
    rules: dbBoundaryRules,
  },
];

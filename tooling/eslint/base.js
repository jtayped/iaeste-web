import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**", ".*/**"],
  },
];

/**
 * Architectural boundaries, enforced where an agent or a hurried human is most
 * likely to cross them. `eslint-plugin-only-warn` downgrades these to warnings
 * for a calm editor experience; `--max-warnings 0` makes them fail in CI.
 */
export const boundaryRules = {
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "MemberExpression[object.name='process'][property.name='env']",
      message:
        "Read configuration from @repo/env instead of process.env. Add the variable to the schema there so it is validated once, at startup.",
    },
  ],
};

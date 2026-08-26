import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ["src/components/ui/command.tsx"],
    rules: {
      // `cmdk` selects its input wrapper through this bare data attribute.
      "react/no-unknown-property": ["error", { ignore: ["cmdk-input-wrapper"] }],
    },
  },
];

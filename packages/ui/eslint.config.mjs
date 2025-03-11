import baseConfig from "@repo/eslint-config/base";
import reactConfig from "@repo/eslint-config/react-internal";

/** @type {import('typescript-eslint').Config} */
export default [...baseConfig, ...reactConfig];

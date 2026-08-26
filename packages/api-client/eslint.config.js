import { config, dbBoundaryRules } from "@repo/eslint-config/base";

// Generated typed client used by browser-facing apps. See base.js's comment
// on dbBoundaryRules for why this can't just live in base.js's own config.
export default [...config, { rules: dbBoundaryRules }];

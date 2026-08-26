import path from "node:path";

import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Standalone output is what the Dockerfile copies into the runtime image:
  // a self-contained `server.js` plus a pruned `node_modules` built from a
  // file trace, so the final image doesn't need `npm install` or the source
  // tree at all.
  output: "standalone",
  // This is a Turborepo workspace, so the file tracing that produces the
  // standalone `node_modules` must follow symlinked workspace dependencies
  // (`@repo/ui`, `@repo/env`, `@repo/constants`, ...) up to the repo root
  // rather than stopping at `apps/web`, or the traced output silently omits
  // them.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
};

export default withNextIntl(nextConfig);

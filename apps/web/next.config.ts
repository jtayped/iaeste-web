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
  images: {
    // Cover images served by apps/cms once BLOG_SOURCE=payload. The Keystatic
    // path uses same-origin /api/blog-assets/* and needs no entry here.
    remotePatterns: [
      { protocol: "https", hostname: "cms.iaestelleida.cat", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "3006", pathname: "/**" },
    ],
  },
};

export default withNextIntl(nextConfig);

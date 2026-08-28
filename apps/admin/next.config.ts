import path from "node:path";

import type { NextConfig } from "next";

import { env } from "@repo/env/admin/server";

/**
 * The browser never talks to the API's own origin. Both auth and domain
 * traffic go out same-origin and are rewritten here, which is what makes the
 * host-only session cookie work without any CORS negotiation at all — see the
 * plan's "The rewrite" section and `docs/auth.md`.
 *
 * Note the asymmetry: Better Auth is mounted at `/api/auth/*` on the API, so
 * that path is forwarded unchanged, while the domain routes live at `/v1/*`
 * with no `/api` prefix — the browser's `/api/v1/*` loses one segment on the
 * way through. Next forwards `Cookie` and `Set-Cookie` across a rewrite on its
 * own; no header plumbing is needed here.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  rewrites: async () => [
    {
      source: "/api/auth/:path*",
      destination: `${env.API_INTERNAL_URL}/api/auth/:path*`,
    },
    {
      source: "/api/v1/:path*",
      destination: `${env.API_INTERNAL_URL}/v1/:path*`,
    },
  ],
};

export default nextConfig;

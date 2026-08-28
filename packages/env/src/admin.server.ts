import { z } from "zod";

import { parseEnv } from "./parse";

/**
 * Server-only configuration for the admin app. There is deliberately **no**
 * client schema: `apps/admin` reaches both `/api/auth/*` and `/api/v1/*`
 * through same-origin Next.js rewrites, so the browser never needs an API
 * URL. Do not add a `NEXT_PUBLIC_ADMIN_API_URL`.
 *
 * The web-push VAPID public key is *also* kept out of here on purpose: the
 * service worker fetches it at runtime from `GET /api/v1/admin/push/public-key`
 * so the browser bundle stays free of compiled-in configuration and the
 * Dockerfile keeps its "no build args" shape.
 */
const schema = z.object({
  /**
   * Where the rewrite and server components reach `apps/api`. On Coolify
   * this is the internal service address, not the public hostname.
   */
  API_INTERNAL_URL: z.string().url(),
  /**
   * Public origin of `apps/web`. Used only to link the admin sidebar out to
   * the blog CMS at `${WEB_PUBLIC_ORIGIN}/keystatic`. Rendered server-side
   * and passed down as a prop, so it never reaches the browser bundle.
   */
  WEB_PUBLIC_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export const env = parseEnv(
  schema,
  {
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    WEB_PUBLIC_ORIGIN: process.env.WEB_PUBLIC_ORIGIN,
  },
  "admin server",
);

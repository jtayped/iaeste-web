"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  inferAdditionalFields,
  magicLinkClient,
} from "better-auth/client/plugins";
// Type-only, and load-bearing: `adminClient()`'s inferred type reaches into
// better-auth's access-control types, which TypeScript cannot *name* in the
// emitted declaration for `authClient` unless the module is referenced from
// this file (TS2742). Removing this line breaks `check-types`.
import type {} from "better-auth/plugins/access";

/**
 * Browser-side Better Auth client.
 *
 * `baseURL` is deliberately **not** set. Better Auth's `withPath()` runs
 * `assertHasProtocol()` on whatever you pass, so a relative `"/api/auth"`
 * throws `Invalid base URL` at module load (verified against better-auth
 * 1.7.x, `dist/utils/url.mjs`). Left unset, the client falls through to
 * `window.location.origin + basePath` — which is exactly the same-origin URL
 * we want, because `next.config.ts` rewrites `/api/auth/*` to the API. Setting
 * an absolute API URL here would be wrong twice over: it would put the browser
 * back on a cross-origin credentialed request, and reading it would mean a
 * `process.env` access on the client, which ESLint rejects.
 *
 * `basePath` is pinned rather than left to the default so that this file and
 * `packages/auth`'s server-side `basePath: "/api/auth"` visibly agree.
 *
 * The auth routes are *not* in `@repo/api-client`: Better Auth is mounted
 * outside the OpenAPI document on purpose. This client and `./api` are two
 * clients sharing one cookie, each typed by its real source.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    magicLinkClient(),
    adminClient(),
    // `role` is added to `user` by the server's admin plugin. Declaring it
    // here is what makes `session.user.role` typed rather than `unknown`.
    inferAdditionalFields({
      user: { role: { type: "string", required: false } },
    }),
  ],
});

export const { signIn, signOut, useSession } = authClient;

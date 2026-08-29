import { createApiClient } from "@repo/api-client";
import { env } from "@repo/env/inscripcions";

/**
 * One client for the whole app. Every screen in the registration flow talks to
 * the same API, and `createApiClient` is cheap but not free to re-run on each
 * render.
 */
export const apiClient = createApiClient(env.NEXT_PUBLIC_API_URL);

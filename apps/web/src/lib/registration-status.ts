import { createApiClient } from "@repo/api-client";
import { env } from "@repo/env/web/client";

/**
 * The registration window the public site advertises. `opensAt`/`closesAt`
 * describe whichever campaign `open` is about — the live one, or the soonest
 * upcoming one when nothing is open yet.
 */
export type RegistrationWindow = {
  open: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

const apiClient = createApiClient(env.NEXT_PUBLIC_API_URL);

/**
 * Read at request time, never from a build variable: the committee flips the
 * campaign flag without redeploying this site, and a stale "inscripcions
 * obertes!" pointing at a closed form is worse than no banner at all. Which is
 * also why every failure resolves to "nothing to announce".
 */
export async function getRegistrationWindow(): Promise<RegistrationWindow | null> {
  try {
    const { data, error } = await apiClient.GET("/v1/registrations/status", {
      // A minute of staleness on a marketing page, rather than an API call
      // per visitor. The countdown itself ticks client-side, so this only
      // bounds how long an open/closed flip takes to show up.
      next: { revalidate: 60 },
    });

    if (error || data === undefined) return null;
    return data;
  } catch {
    return null;
  }
}

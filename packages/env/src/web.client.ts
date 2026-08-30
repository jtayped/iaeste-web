import { z } from "zod";

import { parseEnv } from "./parse";

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

/**
 * Public configuration for the marketing site. Safe to read on the client.
 *
 * `NEXT_PUBLIC_INSCRIPCIONS_STATE` deliberately isn't here any more: the site
 * asks the API whether registrations are open, so a build-time flag can no
 * longer disagree with the campaign the committee actually configured.
 */
export const env = parseEnv(
  schema,
  {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  "web client",
);

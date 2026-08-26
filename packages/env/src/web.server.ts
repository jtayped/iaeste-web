import { z } from "zod";

import { parseEnv } from "./parse";

const schema = z.object({
  RESEND_API_KEY: z.string().min(1),
  CONTACT_FORM_FROM: z.string().email(),
  CONTACT_FORM_TO: z.string().email(),
});

/**
 * Secret configuration for the marketing site.
 *
 * Server-only: importing this from a client component throws, because Next.js
 * does not inline non-`NEXT_PUBLIC_` variables into the browser bundle.
 */
export const env = parseEnv(
  schema,
  {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_FORM_FROM: process.env.CONTACT_FORM_FROM,
    CONTACT_FORM_TO: process.env.CONTACT_FORM_TO,
  },
  "web server",
);

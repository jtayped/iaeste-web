import { z } from "zod";

import { parseEnv } from "./parse";
import { inscripcionsStateSchema } from "./shared";

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_INSCRIPCIONS_STATE: inscripcionsStateSchema,
  // An unset build arg reaches us as "" rather than undefined, so normalise it
  // before the optional URL check — matches the web client schema's handling.
  NEXT_PUBLIC_WHATSAPP_INVITE: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
});

/** Public configuration for the registration site. Safe to read on the client. */
export const env = parseEnv(
  schema,
  {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_INSCRIPCIONS_STATE: process.env.NEXT_PUBLIC_INSCRIPCIONS_STATE,
    NEXT_PUBLIC_WHATSAPP_INVITE: process.env.NEXT_PUBLIC_WHATSAPP_INVITE,
  },
  "inscripcions client",
);

import { z } from "zod";

import { parseEnv } from "./parse";
import { inscripcionsStateSchema } from "./shared";

const schema = z.object({
  NEXT_PUBLIC_INSCRIPCIONS_STATE: inscripcionsStateSchema,
});

/** Public configuration for the marketing site. Safe to read on the client. */
export const env = parseEnv(
  schema,
  {
    NEXT_PUBLIC_INSCRIPCIONS_STATE: process.env.NEXT_PUBLIC_INSCRIPCIONS_STATE,
  },
  "web client",
);

import { z } from "zod";

import { parseEnv } from "./parse";
import { inscripcionsStateSchema } from "./shared";

const schema = z.object({
  NEXT_PUBLIC_INSCRIPCIONS_STATE: inscripcionsStateSchema,
  NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
});

/** Public configuration for the marketing site. Safe to read on the client. */
export const env = parseEnv(
  schema,
  {
    NEXT_PUBLIC_INSCRIPCIONS_STATE: process.env.NEXT_PUBLIC_INSCRIPCIONS_STATE,
    NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG:
      process.env.NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG,
  },
  "web client",
);

export const isProduction = process.env.NODE_ENV === "production";

import { z } from "zod";

/**
 * Whether the registration campaign is currently accepting submissions.
 * Both the marketing site and the registration site branch on this.
 */
export const inscripcionsStateSchema = z
  .enum(["on", "off"])
  .default("off")
  .describe("Set to `on` while registrations are open, `off` otherwise");

export type InscripcionsState = z.infer<typeof inscripcionsStateSchema>;

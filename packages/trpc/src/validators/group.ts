import { z } from "zod";

export const Group = z.object({
  name: z.string().min(2).max(30),
  description: z.string().max(999).optional(),
  isPrivate: z.boolean().default(false),
});

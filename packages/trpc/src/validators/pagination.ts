import { z } from "zod";

export const Pagination = z.object({
  page: z.number().positive().optional(),
  limit: z.number().positive().optional(),
});

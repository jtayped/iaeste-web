import { z } from "zod";

export const Pagination = z.object({
  page: z.number().positive().optional(),
  limit: z.number().positive().optional(),
});

export const Cursor = z.object({
  cursor: z.string().optional(),
  limit: z.number().positive().optional(),
});

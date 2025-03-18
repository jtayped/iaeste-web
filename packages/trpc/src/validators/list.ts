import { z } from "zod";
import { Pagination } from "./pagination";

/**
 * Creates a reusable Zod schema for tRPC routes with sorting, field selection, and pagination
 * @param fields Non-empty array of valid fields for the model (e.g., ['name', 'email', 'createdAt'])
 * @returns Zod schema for tRPC input
 */
export function createListSchema<T extends readonly [string, ...string[]]>(
  fields: T
) {
  return z.object({
    select: z.array(z.enum(fields)).optional(),
    orderBy: z
      .object({
        field: z.enum(fields),
        direction: z.enum(["asc", "desc"]),
      })
      .optional(),
    pagination: Pagination,
  });
}

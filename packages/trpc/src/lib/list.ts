/**
 * Transforms an array of selected fields into a Prisma select object
 * @param select Array of fields to select
 * @returns Prisma select object
 */
export function transformSelectFields(
  select?: string[]
): Record<string, true> | undefined {
  if (!select || select.length === 0) return undefined;

  return select.reduce(
    (acc, field) => {
      acc[field] = true;
      return acc;
    },
    {} as Record<string, true>
  );
}

/**
 * Creates a Prisma orderBy clause from the orderBy input
 * @param orderBy Object containing the field and direction to order by
 * @returns Prisma orderBy clause
 */
export function transformOrderByClause(orderBy?: {
  field: string;
  direction: "asc" | "desc";
}) {
  if (!orderBy) return undefined;

  return [{ [orderBy.field]: orderBy.direction }];
}

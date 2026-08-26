/**
 * The repo's `tsconfig` turns on `noUncheckedIndexedAccess`, so
 * `const [row] = await db.insert(...).returning()` types `row` as
 * `T | undefined` even though a single-row `INSERT ... RETURNING` always
 * returns exactly one row. Rather than sprinkle non-null assertions at every
 * call site, insert/update-and-return call sites go through this helper:
 * it turns "TypeScript doesn't know this array is non-empty" into an actual
 * runtime check, which is strictly safer than an assertion (a genuinely
 * empty result becomes a clear thrown error instead of `undefined` silently
 * flowing further into the transaction).
 */
export function firstOrThrow<T>(
  rows: T[],
  message = "Expected exactly one row, got none",
): T {
  const [row] = rows;
  if (row === undefined) {
    throw new Error(message);
  }
  return row;
}

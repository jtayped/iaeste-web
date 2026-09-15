import { asc, desc, sql, type SQL, type SQLWrapper } from "drizzle-orm";

import type { SortDirection } from "@repo/constants/validators/admin-list";

/**
 * Turning a validated `(key, dir)` into `ORDER BY` terms, in one place.
 *
 * Every admin list repository declares a map from its sort keys to the SQL
 * that orders by them, and hands the chosen entry here. The helper exists so
 * the four cannot each get the direction or the tiebreaker subtly different —
 * a list that forgets the tiebreaker repeats and skips rows across a page
 * boundary, which is a bug nobody notices until someone is missing from a
 * roll.
 *
 * `key` is always a value the route's `z.enum` already accepted, so there is
 * no unknown-column case to handle here: an unrecognised key is a 422 long
 * before any of this runs.
 */

/** A term that keeps its empty rows at the bottom whichever way you sort. */
export interface NullsLastTerm {
  readonly nullsLast: SQLWrapper;
}

export type SortTerm = SQLWrapper | NullsLastTerm;

/**
 * Marks a nullable term as sorting its empties to the bottom in *both*
 * directions.
 *
 * Postgres's default is nulls last ascending but nulls first descending, so
 * without this, reversing the invitations name sort opens the table with a
 * screenful of "—" before the first person. Used only where a column is
 * genuinely often empty; elsewhere the default is what a reader expects.
 */
export function nullsLast(term: SQLWrapper): NullsLastTerm {
  return { nullsLast: term };
}

function isNullsLast(term: SortTerm): term is NullsLastTerm {
  return typeof term === "object" && term !== null && "nullsLast" in term;
}

/**
 * The chosen terms plus the table's primary key, all in `dir`.
 *
 * The tiebreaker is appended here rather than by each caller precisely so it
 * cannot be forgotten, and it takes the same direction as everything else so
 * that `desc` is the exact reverse of `asc` — two pages of the same list read
 * backwards must not disagree about who is on them.
 */
export function orderTerms(
  terms: readonly SortTerm[],
  dir: SortDirection,
  tiebreaker: SQLWrapper,
): SQL[] {
  const keyword = dir === "asc" ? sql`asc` : sql`desc`;
  const direct = dir === "asc" ? asc : desc;

  return [...terms, tiebreaker].map((term) =>
    isNullsLast(term)
      ? sql`${term.nullsLast} ${keyword} nulls last`
      : direct(term),
  );
}

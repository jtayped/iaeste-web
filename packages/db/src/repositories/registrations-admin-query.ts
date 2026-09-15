import { and, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";

import type { RegistrationSortKey } from "@repo/constants/validators/admin-list";

import { registration } from "../schema/registration";
import type { SortTerm } from "./sort";
import type { registrationStatusEnum } from "../schema/registration";

type RegistrationStatus = (typeof registrationStatusEnum.enumValues)[number];

/** The filters the admin review queue applies, without the paging. */
export interface AdminRegistrationFilters {
  campaignId: string;
  status?: RegistrationStatus;
  q?: string;
}

/**
 * Cross-page selection over the review queue, in the shape every selectable
 * admin table uses: either the rows an operator ticked, or "everything this
 * filter matches" minus the rows they un-ticked. The second form is what lets
 * a bulk action mean the whole result set rather than the page in front of
 * them.
 */
export type RegistrationSelection =
  | { mode: "ids"; registrationIds: string[] }
  | (AdminRegistrationFilters & {
      mode: "all";
      excludedRegistrationIds: string[];
    });

/**
 * The review queue's SQL filter, shared by the paged list and by every bulk
 * action resolved against it. One definition means a selection can never
 * resolve to a different set of people than the table the operator was
 * looking at.
 */
export function adminRegistrationWhere(params: AdminRegistrationFilters) {
  const clauses = [eq(registration.campaignId, params.campaignId)];
  if (params.status) clauses.push(eq(registration.status, params.status));

  const needle = params.q?.trim();
  if (needle) {
    const like = `%${needle}%`;
    const search = or(
      ilike(registration.email, like),
      ilike(registration.universityEmail, like),
      ilike(registration.personalEmail, like),
      sql`${registration.profileSnapshot} ->> 'name' ilike ${like}`,
      sql`${registration.profileSnapshot} ->> 'surnames' ilike ${like}`,
    );
    if (search) clauses.push(search);
  }

  return and(...clauses);
}

/**
 * The where-clause a cross-page selection resolves to.
 *
 * Kept next to `adminRegistrationWhere` rather than in the repository so the
 * two can never drift: a selection must always mean the same rows the table
 * it was taken from was showing.
 */
export function registrationSelectionWhere(selection: RegistrationSelection) {
  if (selection.mode === "ids") {
    return inArray(registration.id, selection.registrationIds);
  }

  return and(
    adminRegistrationWhere(selection),
    selection.excludedRegistrationIds.length > 0
      ? notInArray(registration.id, selection.excludedRegistrationIds)
      : undefined,
  );
}

/**
 * What each sort key orders by.
 *
 * The person's own fields live in the JSONB snapshot rather than in columns,
 * so they sort as the text the table renders. `studyYear` is cast to an
 * integer first or "10" would sort between "1" and "2". `email` sorts by what
 * the column actually shows, which is the personal address when there is one.
 *
 * `status` orders by the enum, which Postgres sorts in declaration order —
 * here that is the lifecycle, `pending_email` through `rejected`, which is
 * the grouping an operator working a queue wants.
 */
const REGISTRATION_SORTS: Record<RegistrationSortKey, readonly SortTerm[]> = {
  name: [
    sql`${registration.profileSnapshot} ->> 'name'`,
    sql`${registration.profileSnapshot} ->> 'surnames'`,
  ],
  surnames: [
    sql`${registration.profileSnapshot} ->> 'surnames'`,
    sql`${registration.profileSnapshot} ->> 'name'`,
  ],
  email: [sql`coalesce(${registration.personalEmail}, ${registration.email})`],
  degree: [sql`${registration.profileSnapshot} ->> 'degree'`],
  studyYear: [
    sql`nullif(${registration.profileSnapshot} ->> 'studyYear', '')::int`,
  ],
  status: [registration.status],
  createdAt: [registration.createdAt],
};

export function registrationSortTerms(
  key: RegistrationSortKey,
): readonly SortTerm[] {
  return REGISTRATION_SORTS[key];
}

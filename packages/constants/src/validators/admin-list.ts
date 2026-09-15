import { z } from "zod";

/**
 * The one query shape every admin list screen speaks.
 *
 * Search, filters, sort and pagination are URL parameters that the API
 * resolves in SQL. Nothing is filtered, sorted or sliced in memory on either
 * side — a `.filter()` or `.sort()` over rows already fetched is the specific
 * bug this contract exists to prevent.
 *
 * It lives here rather than in `apps/api` because three packages need the
 * same truth: the API validates requests against it, `packages/db` types its
 * repository params from the key unions, and `apps/admin` both declares its
 * sortable columns from them and re-parses the address bar through the same
 * schema. One definition means a screen that spells a sort key wrong fails
 * `check-types` instead of getting a 422 at runtime.
 */

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
export const sortDirectionSchema = z.enum(SORT_DIRECTIONS);

/** A resolved ordering: which column, which way. */
export interface ListSort<K extends string> {
  key: K;
  dir: SortDirection;
}

export const LIST_DEFAULT_LIMIT = 50;
export const LIST_MAX_LIMIT = 200;

/**
 * Builds a list route's query schema.
 *
 * `sort` and `dir` are two independent enums rather than one `?sort=-name`
 * string. Two enums become two literal unions on the generated client, so a
 * typo is a compile error; a `-` prefix would need a regex and lose that.
 * They also default independently, so `?dir=desc` alone means "the default
 * column, descending" — which is exactly what the admin produces when it
 * strips a parameter sitting at its default.
 *
 * `search` is required because every admin list has a search box. A future
 * list without one should still accept and ignore `q` rather than diverge.
 */
export function listQuerySchema<K extends string>(options: {
  sortKeys: readonly [K, ...K[]];
  defaultSort: ListSort<K>;
  /** Max length of `q`. */
  search: number;
  limit?: { default: number; max: number };
}) {
  const limit = options.limit ?? {
    default: LIST_DEFAULT_LIMIT,
    max: LIST_MAX_LIMIT,
  };

  return z.object({
    q: z.string().trim().max(options.search).optional(),
    sort: z.enum(options.sortKeys).default(options.defaultSort.key),
    dir: sortDirectionSchema.default(options.defaultSort.dir),
    limit: z.coerce.number().int().min(1).max(limit.max).default(limit.default),
    offset: z.coerce.number().int().min(0).default(0),
  });
}

/**
 * The envelope every admin list route returns, so the four cannot drift.
 *
 * The effective sort is deliberately not echoed: the client knows the
 * defaults from this same file, and echoing would only create a second
 * source of truth for the two to disagree about.
 */
export function listPageSchema<T extends z.ZodTypeAny>(row: T) {
  return z.object({
    rows: z.array(row),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  });
}

// --- Shared enumerations ---------------------------------------------------
//
// One copy each. The Drizzle enum is the database's own declaration and stays;
// every hand-written list in the API and the admin reads from here instead.

export const REGISTRATION_STATUSES = [
  "pending_email",
  "pending_review",
  "accepted",
  "rejected",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const CAMPAIGN_STATES = ["draft", "published", "archived"] as const;
export type CampaignState = (typeof CAMPAIGN_STATES)[number];

/**
 * What the invitations table can filter by. `expired` is not a stored status
 * but `pending` past `expiresAt`, computed in SQL.
 */
export const INVITATION_STATUS_FILTERS = [
  "pending",
  "accepted",
  "cancelled",
  "expired",
] as const;
export type InvitationStatusFilter = (typeof INVITATION_STATUS_FILTERS)[number];

export const MEMBER_FILTERS = ["all", "current", "past"] as const;
export type MemberFilter = (typeof MEMBER_FILTERS)[number];

// --- Members ---------------------------------------------------------------

/**
 * Every column of the member table sorts by its own value.
 *
 * `name` and `surnames` are separate keys on purpose: an operator looking for
 * someone they know by given name should be able to click `nom`, and one
 * reading a roll should be able to click `cognoms`. Each falls back to the
 * other as a secondary term, so `surnames asc` is exactly the order this list
 * has always had.
 */
export const MEMBER_SORT_KEYS = [
  "name",
  "surnames",
  "email",
  "degree",
  "studyYear",
  "role",
  "status",
  "totalMemberships",
  "targetState",
] as const;
export type MemberSortKey = (typeof MEMBER_SORT_KEYS)[number];

/** Surname first, ascending — the order every roll and CSV export uses. */
export const MEMBER_DEFAULT_SORT = {
  key: "surnames",
  dir: "asc",
} as const satisfies ListSort<MemberSortKey>;

export const memberListQuerySchema = listQuerySchema({
  sortKeys: MEMBER_SORT_KEYS,
  defaultSort: MEMBER_DEFAULT_SORT,
  search: 120,
  limit: { default: 25, max: 100 },
}).extend({
  filter: z.enum(MEMBER_FILTERS).optional(),
  /** Exact active membership source; replaces current/past when present. */
  campaignId: z.string().min(1).optional(),
  /** Adds invitation readiness relative to this campaign. */
  targetCampaignId: z.string().min(1).optional(),
});

// --- Registrations ---------------------------------------------------------

export const REGISTRATION_SORT_KEYS = [
  "name",
  "surnames",
  "email",
  "degree",
  "studyYear",
  "status",
  "createdAt",
] as const;
export type RegistrationSortKey = (typeof REGISTRATION_SORT_KEYS)[number];

/** Newest first: a review queue is read from the top. */
export const REGISTRATION_DEFAULT_SORT = {
  key: "createdAt",
  dir: "desc",
} as const satisfies ListSort<RegistrationSortKey>;

export const registrationListQuerySchema = listQuerySchema({
  sortKeys: REGISTRATION_SORT_KEYS,
  defaultSort: REGISTRATION_DEFAULT_SORT,
  search: 200,
}).extend({
  /** Required, so omitting it can never list across every campaign at once. */
  campaignId: z.string().min(1),
  status: z.enum(REGISTRATION_STATUSES).optional(),
});

// --- Invitations -----------------------------------------------------------

/** `name` orders by the prefill name then surnames, empty prefills last. */
export const INVITATION_SORT_KEYS = [
  "email",
  "name",
  "status",
  "role",
  "createdAt",
  "expiresAt",
] as const;
export type InvitationSortKey = (typeof INVITATION_SORT_KEYS)[number];

export const INVITATION_DEFAULT_SORT = {
  key: "createdAt",
  dir: "desc",
} as const satisfies ListSort<InvitationSortKey>;

export const invitationListQuerySchema = listQuerySchema({
  sortKeys: INVITATION_SORT_KEYS,
  defaultSort: INVITATION_DEFAULT_SORT,
  search: 200,
}).extend({
  campaignId: z.string().min(1),
  status: z.enum(INVITATION_STATUS_FILTERS).optional(),
});

// --- Campaigns -------------------------------------------------------------

/**
 * `flags` is deliberately absent: that column renders two independent
 * booleans as badges, and there is no single value for "sort by context".
 */
export const CAMPAIGN_SORT_KEYS = [
  "label",
  "slug",
  "state",
  "activeMembers",
  "pendingReview",
  "membershipStartsAt",
] as const;
export type CampaignSortKey = (typeof CAMPAIGN_SORT_KEYS)[number];

export const CAMPAIGN_DEFAULT_SORT = {
  key: "membershipStartsAt",
  dir: "desc",
} as const satisfies ListSort<CampaignSortKey>;

export const campaignListQuerySchema = listQuerySchema({
  sortKeys: CAMPAIGN_SORT_KEYS,
  defaultSort: CAMPAIGN_DEFAULT_SORT,
  search: 200,
  limit: { default: 100, max: 200 },
}).extend({
  state: z.enum(CAMPAIGN_STATES).optional(),
});

// --- Bulk actions ----------------------------------------------------------

/**
 * What a *new* bulk route reports.
 *
 * The three that exist (bulk accept, bulk invite, broadcast send) each name
 * what they count in their own shape and keep it; rewriting them would touch
 * three routes, three suites and the generated client for a uniformity only
 * the admin sees. They map into this shape on the client instead. Anything
 * added from here on returns it directly, so that mapping becomes the
 * identity.
 */
export const bulkOutcomeSchema = z.object({
  requested: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
  skipped: z.array(
    z.object({ reason: z.string(), count: z.number().int().positive() }),
  ),
  failed: z.array(
    z.object({ rowId: z.string(), label: z.string(), reason: z.string() }),
  ),
});
export type BulkOutcomePayload = z.infer<typeof bulkOutcomeSchema>;

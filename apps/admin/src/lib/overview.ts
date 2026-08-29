import type { components } from "@repo/api-client";

/** Response shape of `GET /v1/admin/overview`, from the generated client. */
export type AdminOverview = components["schemas"]["AdminOverview"];
export type AdminCampaignRef = components["schemas"]["AdminCampaignRef"];
export type AdminOverviewCounts = AdminOverview["counts"];

/**
 * `forbidden` covers both 401 and 403: either way this browser may not be in
 * the admin app, and the caller's response is the same redirect. `error` is
 * kept separate so an API outage renders an error screen rather than bouncing
 * a legitimately signed-in admin back to sign-in.
 */
export type OverviewResult =
  | { status: "ok"; overview: AdminOverview }
  | { status: "forbidden" }
  | { status: "error"; message: string };

/** Total work sitting in the review queue — the sidebar badge and the callout. */
export function pendingWorkCount(counts: AdminOverviewCounts): number {
  return counts.pendingReview + counts.pendingVerification;
}

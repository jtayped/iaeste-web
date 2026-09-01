import { and, desc, eq, inArray, lt, ne } from "drizzle-orm";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { membership } from "../schema/membership";
import { membershipCampaign } from "../schema/membership-campaign";
import { userEmail } from "../schema/user-email";
import { EmailIdentityConflictError } from "./errors";

/**
 * Finds the member account that may renew into `campaignId` without review.
 *
 * "Last campaign" means the newest published or archived campaign whose
 * membership starts before the target campaign. The member must still have
 * an active row there. A past `left` or `kicked` row never grants automatic
 * acceptance.
 */
export async function findAutomaticallyAcceptedUser(
  db: Db,
  rawEmails: readonly string[],
  campaignId: string,
): Promise<string | undefined> {
  const emails = [
    ...new Set(
      rawEmails.map((email) => email.trim().toLowerCase()).filter(Boolean),
    ),
  ];
  if (emails.length === 0) return undefined;

  const [aliases, canonicalUsers, targetCampaign] = await Promise.all([
    db
      .select({ id: userEmail.userId })
      .from(userEmail)
      .where(inArray(userEmail.email, emails)),
    db.select({ id: user.id }).from(user).where(inArray(user.email, emails)),
    db
      .select({ membershipStartsAt: membershipCampaign.membershipStartsAt })
      .from(membershipCampaign)
      .where(eq(membershipCampaign.id, campaignId))
      .then(([row]) => row),
  ]);

  const userIds = new Set([
    ...aliases.map((row) => row.id),
    ...canonicalUsers.map((row) => row.id),
  ]);
  if (userIds.size > 1) throw new EmailIdentityConflictError();
  const userId = userIds.values().next().value as string | undefined;
  if (!userId || !targetCampaign) return undefined;

  const [previousCampaign] = await db
    .select({ id: membershipCampaign.id })
    .from(membershipCampaign)
    .where(
      and(
        lt(
          membershipCampaign.membershipStartsAt,
          targetCampaign.membershipStartsAt,
        ),
        ne(membershipCampaign.state, "draft"),
      ),
    )
    .orderBy(desc(membershipCampaign.membershipStartsAt))
    .limit(1);
  if (!previousCampaign) return undefined;

  const [priorMembership] = await db
    .select({ userId: membership.userId })
    .from(membership)
    .where(
      and(
        eq(membership.userId, userId),
        eq(membership.campaignId, previousCampaign.id),
        eq(membership.status, "active"),
      ),
    );

  return priorMembership?.userId;
}

import { and, desc, eq, inArray, or } from "drizzle-orm";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { memberProfile } from "../schema/member-profile";
import { membership } from "../schema/membership";
import { membershipCampaign } from "../schema/membership-campaign";
import { registration } from "../schema/registration";
import { userEmail } from "../schema/user-email";
import type {
  RegistrationProfileSnapshot,
  RegistrationStatus,
} from "./registrations";

/** Everything the form can prefill, in the shape the form's fields use. */
export interface KnownProfile {
  name: string;
  surnames: string;
  phone: string;
  degree: string;
  year: number;
}

/** One line of "you were with us in…" — a campaign and how it went. */
export interface KnownMembership {
  campaignLabel: string;
  status: string;
  joinedAt: Date;
  endedAt: Date | null;
}

export interface KnownPerson {
  /** True when anything below was found. The form branches on this. */
  known: boolean;
  profile: KnownProfile | null;
  memberships: KnownMembership[];
  /** Status of this person's registration in the campaign now open, if any. */
  openCampaignRegistrationStatus: RegistrationStatus | null;
}

const UNKNOWN: KnownPerson = {
  known: false,
  profile: null,
  memberships: [],
  openCampaignRegistrationStatus: null,
};

export class EmailIdentityConflictError extends Error {
  constructor() {
    super("The supplied email addresses belong to different users.");
    this.name = "EmailIdentityConflictError";
  }
}

/**
 * What the committee already holds on one email address.
 *
 * Only ever called behind proof that the caller controls the address — a
 * consumed `email_challenge` or an invitation token. There is deliberately no
 * unauthenticated path to this function: it returns a phone number and a
 * membership history, which is exactly what an enumeration attack would want.
 *
 * Two sources, in order of trust. `member_profile` is current, mutable truth
 * for someone who has an account. A past `registration` snapshot is the
 * fallback for someone who applied and was never accepted (or is still
 * waiting) — stale, but far better than an empty form, and they get to
 * correct it on screen before it is submitted again.
 */
export function createKnownPersonRepository(db: Db) {
  return {
    async lookup(rawEmail: string): Promise<KnownPerson> {
      return this.lookupEmails([rawEmail]);
    },

    async lookupEmails(rawEmails: readonly string[]): Promise<KnownPerson> {
      const emails = [
        ...new Set(
          rawEmails.map((email) => email.trim().toLowerCase()).filter(Boolean),
        ),
      ];
      if (emails.length === 0) return UNKNOWN;

      const [aliasAccounts, canonicalAccounts] = await Promise.all([
        db
          .select({ id: userEmail.userId })
          .from(userEmail)
          .where(inArray(userEmail.email, emails)),
        db
          .select({ id: user.id })
          .from(user)
          .where(inArray(user.email, emails)),
      ]);
      const accountIds = new Set([
        ...aliasAccounts.map((row) => row.id),
        ...canonicalAccounts.map((row) => row.id),
      ]);
      if (accountIds.size > 1) throw new EmailIdentityConflictError();
      const accountId = accountIds.values().next().value as string | undefined;

      const [profileRow] = accountId
        ? await db
            .select()
            .from(memberProfile)
            .where(eq(memberProfile.userId, accountId))
        : [];

      const membershipRows = accountId
        ? await db
            .select({
              status: membership.status,
              joinedAt: membership.joinedAt,
              endedAt: membership.endedAt,
              campaignLabel: membershipCampaign.label,
            })
            .from(membership)
            .innerJoin(
              membershipCampaign,
              eq(membership.campaignId, membershipCampaign.id),
            )
            .where(eq(membership.userId, accountId))
            .orderBy(desc(membershipCampaign.membershipStartsAt))
        : [];

      // Newest first, so the fallback prefill is the most recent thing this
      // person told us rather than whatever they wrote three years ago.
      const [latestRegistration] = await db
        .select()
        .from(registration)
        .where(
          or(
            inArray(registration.email, emails),
            inArray(registration.universityEmail, emails),
            inArray(registration.personalEmail, emails),
          ),
        )
        .orderBy(desc(registration.createdAt))
        .limit(1);

      const [openCampaign] = await db
        .select({ id: membershipCampaign.id })
        .from(membershipCampaign)
        .where(eq(membershipCampaign.isRegistrationOpen, true));

      const [openRegistration] = openCampaign
        ? await db
            .select({ status: registration.status })
            .from(registration)
            .where(
              and(
                eq(registration.campaignId, openCampaign.id),
                or(
                  inArray(registration.email, emails),
                  inArray(registration.universityEmail, emails),
                  inArray(registration.personalEmail, emails),
                ),
              ),
            )
        : [];

      const snapshot = latestRegistration?.profileSnapshot as
        RegistrationProfileSnapshot | undefined;

      const profile: KnownProfile | null = profileRow
        ? {
            name: profileRow.name,
            surnames: profileRow.surnames,
            phone: profileRow.phoneDisplay,
            degree: profileRow.degree,
            year: profileRow.studyYear,
          }
        : snapshot
          ? {
              name: snapshot.name,
              surnames: snapshot.surnames,
              phone: snapshot.phoneDisplay,
              degree: snapshot.degree,
              year: snapshot.studyYear,
            }
          : null;

      return {
        known: Boolean(profile) || membershipRows.length > 0,
        profile,
        memberships: membershipRows.map((row) => ({
          campaignLabel: row.campaignLabel,
          status: row.status,
          joinedAt: row.joinedAt,
          endedAt: row.endedAt,
        })),
        openCampaignRegistrationStatus:
          (openRegistration?.status as RegistrationStatus | undefined) ?? null,
      };
    },
  };
}

export type KnownPersonRepository = ReturnType<
  typeof createKnownPersonRepository
>;

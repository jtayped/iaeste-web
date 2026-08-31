interface ProfileRow {
  userId: string;
  name: string;
  surnames: string;
  email: string;
  phoneE164: string;
  phoneDisplay: string;
  degree: string;
  studyYear: number;
  role: string | null;
  createdAt: Date;
}

interface MembershipJoinRow {
  membership: {
    id: string;
    campaignId: string;
    status: string;
    source: string;
    joinedAt: Date;
    endedAt: Date | null;
    endedReason: string | null;
  };
  campaign: { id: string; slug: string; label: string };
}

interface EventRow {
  id: string;
  eventType: string;
  actorId: string | null;
  campaignId: string | null;
  details: unknown;
  createdAt: Date;
}

interface EmailRow {
  email: string;
  verifiedAt: Date | null;
}

export interface MemberEmails {
  university: EmailRow | null;
  personal: EmailRow | null;
}

function toEmailView(row: EmailRow | null) {
  return row
    ? { email: row.email, verifiedAt: row.verifiedAt?.toISOString() ?? null }
    : null;
}

export function toMemberDetail(
  profile: ProfileRow,
  emails: MemberEmails,
  memberships: MembershipJoinRow[],
  events: EventRow[],
) {
  return {
    profile: {
      userId: profile.userId,
      name: profile.name,
      surnames: profile.surnames,
      email: profile.email,
      phoneE164: profile.phoneE164,
      phoneDisplay: profile.phoneDisplay,
      degree: profile.degree,
      studyYear: profile.studyYear,
      role: profile.role,
      createdAt: profile.createdAt.toISOString(),
    },
    emails: {
      university: toEmailView(emails.university),
      personal: toEmailView(emails.personal),
    },
    memberships: memberships.map((row) => ({
      id: row.membership.id,
      campaignId: row.campaign.id,
      campaignSlug: row.campaign.slug,
      campaignLabel: row.campaign.label,
      status: row.membership.status,
      source: row.membership.source,
      joinedAt: row.membership.joinedAt.toISOString(),
      endedAt: row.membership.endedAt
        ? row.membership.endedAt.toISOString()
        : null,
      endedReason: row.membership.endedReason,
    })),
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      actorId: event.actorId,
      campaignId: event.campaignId,
      details: event.details ?? null,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

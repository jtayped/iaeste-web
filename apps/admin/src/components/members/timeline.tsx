import Link from "next/link";

import {
  Panel,
  Section,
  Timeline,
  TimelineItem,
  type TimelineTone,
} from "@/components/admin/detail-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import type {
  AdminMemberTimelineEvent,
  AdminMemberTimelineMembership,
} from "@/lib/admin-types";
import { formatDate, formatDateTime } from "@/lib/format";
import { eventLabel, membershipStatus } from "@/lib/labels";

function markerTone(status: string): TimelineTone {
  if (status === "active") return "active";
  if (status === "kicked") return "danger";
  return "muted";
}

/**
 * The registration this alta came from.
 *
 * There is no registration id on a membership, so the link is the review queue
 * filtered to the same campaign and searched by the member's address — `q`
 * matches all three stored emails server-side. It is only offered for an alta
 * that actually came from a sol·licitud: an invitation or an admin-created
 * membership has no registration to open.
 */
function RegistrationLink({
  membership,
  email,
}: {
  membership: AdminMemberTimelineMembership;
  email: string;
}) {
  if (membership.source !== "registration") return null;

  const href = `/registrations?campaign=${membership.campaignId}&status=accepted&q=${encodeURIComponent(email)}`;

  return (
    <Link
      href={href}
      className="mt-1 inline-block text-xs font-medium text-secondary underline-offset-4 hover:underline"
    >
      obre la sol·licitud d&apos;aquesta campanya
    </Link>
  );
}

/**
 * The membership history, newest first, drawn as a vertical rail.
 *
 * The rail is what makes "three campaigns with a gap in the middle" readable
 * at a glance — the same rows in a table are just three dates you have to
 * compare by hand.
 */
export function MembershipTimeline({
  memberships,
  email,
}: {
  memberships: readonly AdminMemberTimelineMembership[];
  email: string;
}) {
  if (memberships.length === 0) {
    return (
      <Section title="historial">
        <Panel className="border-dashed">
          <p className="px-4 py-6 text-sm text-muted-foreground">
            encara no té cap alta registrada.
          </p>
        </Panel>
      </Section>
    );
  }

  return (
    <Section
      title="historial"
      description="cada alta d'aquesta persona, de la més recent a la més antiga."
    >
      <Panel className="p-4">
        <Timeline>
          {memberships.map((membership, index) => (
            <TimelineItem
              key={membership.id}
              tone={markerTone(membership.status)}
              last={index === memberships.length - 1}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/campaigns/${membership.campaignId}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {membership.campaignLabel}
                </Link>
                <StatusBadge status={membershipStatus(membership.status)} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(membership.joinedAt)} –{" "}
                {membership.endedAt
                  ? formatDate(membership.endedAt)
                  : "en actiu"}
                {membership.source ? ` · via ${membership.source}` : ""}
              </p>
              {membership.endedReason ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  motiu: {membership.endedReason}
                </p>
              ) : null}
              <RegistrationLink membership={membership} email={email} />
            </TimelineItem>
          ))}
        </Timeline>
      </Panel>
    </Section>
  );
}

/**
 * The append-only audit log. Every status transition writes exactly one row,
 * so this is the answer to "who did this and when" — shown verbatim rather
 * than summarised, because a summary of an audit trail is not one.
 */
export function EventLog({
  events,
}: {
  events: readonly AdminMemberTimelineEvent[];
}) {
  if (events.length === 0) return null;

  return (
    <Section title="registre d'accions">
      <Panel>
        <ul className="divide-y divide-border">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="text-sm">{eventLabel(event.eventType)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatDateTime(event.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </Section>
  );
}

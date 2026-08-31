import Link from "next/link";

import { Section } from "@/components/admin/detail-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import type {
  AdminMemberTimelineEvent,
  AdminMemberTimelineMembership,
} from "@/lib/admin-types";
import { formatDate, formatDateTime } from "@/lib/format";
import { eventLabel, membershipStatus } from "@/lib/labels";

/**
 * The membership history, newest first, drawn as a vertical rail.
 *
 * The rail is what makes "three campaigns with a gap in the middle" readable
 * at a glance — the same rows in a table are just three dates you have to
 * compare by hand.
 */
export function MembershipTimeline({
  memberships,
}: {
  memberships: readonly AdminMemberTimelineMembership[];
}) {
  if (memberships.length === 0) {
    return (
      <Section title="historial">
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          encara no té cap alta registrada.
        </p>
      </Section>
    );
  }

  return (
    <Section title="historial">
      <ol className="relative space-y-4 border-l border-border pl-5">
        {memberships.map((membership) => (
          <li key={membership.id} className="relative">
            <span
              aria-hidden
              className="absolute top-1.5 -left-[1.4375rem] size-2 rounded-full bg-border ring-4 ring-background"
            />
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
              {membership.endedAt ? formatDate(membership.endedAt) : "en actiu"}
              {membership.source ? ` · via ${membership.source}` : ""}
            </p>
            {membership.endedReason ? (
              <p className="mt-1 text-xs text-muted-foreground">
                motiu: {membership.endedReason}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
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
      <ul className="divide-y divide-border rounded-lg border border-border">
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
    </Section>
  );
}

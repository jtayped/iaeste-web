"use client";

import { Badge } from "@repo/ui/badge";

import { Field, FieldList, Section } from "@/components/admin/detail-panel";
import { EditMemberEmailsDialog } from "@/components/members/edit-emails-dialog";
import { MemberActions } from "@/components/members/member-actions";
import { EventLog, MembershipTimeline } from "@/components/members/timeline";
import {
  fullName,
  type AdminMemberDetail,
  type AdminMemberEmail,
} from "@/lib/admin-types";
import { formatDate } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import { useMember } from "@/lib/members";

function EmailAddress({ address }: { address: AdminMemberEmail }) {
  if (!address) return "no consta";

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{address.email}</span>
      <Badge variant={address.verifiedAt ? "secondary" : "outline"}>
        {address.verifiedAt ? "verificat" : "sense verificar"}
      </Badge>
    </span>
  );
}

/**
 * The member fitxa.
 *
 * It re-queries through TanStack Query on top of the server's first paint so
 * that an action taken here (a baixa, a role change) redraws the profile and
 * the timeline it just changed, rather than leaving the page stating the old
 * facts until a reload.
 */
export function MemberDetail({
  userId,
  initialData,
}: {
  userId: string;
  initialData: AdminMemberDetail;
}) {
  const { data } = useMember(userId, initialData);
  const member = data ?? initialData;
  const { profile } = member;

  return (
    <div className="space-y-6 md:space-y-8">
      <Section title="perfil">
        <FieldList>
          <Field label="telèfon">{profile.phoneDisplay}</Field>
          <Field label="grau">{profile.degree}</Field>
          <Field label="curs">{profile.studyYear}</Field>
          <Field label="rol">{roleLabel(profile.role)}</Field>
          <Field label="compte creat">{formatDate(profile.createdAt)}</Field>
        </FieldList>
      </Section>

      <Section
        title="correus"
        action={
          <EditMemberEmailsDialog
            userId={userId}
            name={fullName(profile)}
            emails={member.emails}
          />
        }
      >
        <FieldList>
          <Field label="correu universitari">
            <EmailAddress address={member.emails.university} />
          </Field>
          <Field label="correu personal">
            <EmailAddress address={member.emails.personal} />
          </Field>
        </FieldList>
      </Section>

      <MembershipTimeline memberships={member.memberships} />

      <MemberActions member={member} />

      <EventLog events={member.events} />
    </div>
  );
}

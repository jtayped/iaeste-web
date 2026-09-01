"use client";

import { Badge } from "@repo/ui/badge";

import { Field, FieldList, Section } from "@/components/admin/detail-panel";
import { EditMemberEmailsDialog } from "@/components/members/edit-emails-dialog";
import { ProfileForm } from "@/components/profile/profile-form";
import type { AdminMemberEmail, AdminOwnProfile } from "@/lib/admin-types";
import { formatDate } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import { useOwnProfile } from "@/lib/profile";

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

export function OwnProfile({ initialData }: { initialData: AdminOwnProfile }) {
  const { data } = useOwnProfile(initialData);
  const current = data ?? initialData;
  const { profile, emails } = current;

  return (
    <div className="space-y-6 md:space-y-8">
      <Section title="dades personals">
        <ProfileForm profile={profile} />
      </Section>

      <Section
        title="correus d'accés"
        action={
          profile.role === "admin" ? (
            <EditMemberEmailsDialog
              userId={profile.userId}
              name={`${profile.name} ${profile.surnames}`.trim()}
              emails={emails}
            />
          ) : undefined
        }
      >
        <FieldList>
          <Field label="correu universitari">
            <EmailAddress address={emails.university} />
          </Field>
          <Field label="correu personal">
            <EmailAddress address={emails.personal} />
          </Field>
        </FieldList>
        {profile.role !== "admin" ? (
          <p className="max-w-2xl text-xs text-muted-foreground">
            per canviar un correu d&apos;accés, demana-ho a una persona
            administradora. una adreça nova s&apos;ha de verificar abans de
            poder-hi entrar.
          </p>
        ) : null}
      </Section>

      <Section title="compte">
        <FieldList>
          <Field label="rol">{roleLabel(profile.role)}</Field>
          <Field label="compte creat">{formatDate(profile.createdAt)}</Field>
        </FieldList>
      </Section>
    </div>
  );
}

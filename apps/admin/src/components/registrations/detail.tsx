"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertTitle,
} from "@repo/ui/alert";
import { Badge } from "@repo/ui/badge";

import { Field, FieldList, Section } from "@/components/admin/detail-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { RegistrationActions } from "@/components/registrations/detail-actions";
import type { AdminRegistrationDetail } from "@/lib/admin-types";
import { fullName } from "@/lib/admin-types";
import { formatDateTime } from "@/lib/format";
import { membershipStatus, registrationStatus } from "@/lib/labels";
import { useRegistration } from "@/lib/registrations";

/**
 * A duplicate is not a blocker — the same person legitimately registers again
 * in a later campaign — so it renders as a warning with the other rows listed,
 * not as a refusal. The one it must catch is a second registration in the
 * *same* campaign, which is why the campaign label is on every line.
 */
function DuplicateWarning({
  duplicates,
}: {
  duplicates: AdminRegistrationDetail["duplicateRegistrations"];
}) {
  if (duplicates.length === 0) return null;

  return (
    <Alert>
      <AlertIndicator>
        <TriangleAlert className="size-4" aria-hidden />
      </AlertIndicator>
      <AlertContent>
        <AlertTitle>hi ha altres sol·licituds amb aquest correu</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1">
            {duplicates.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/registrations/${row.id}`}
                  className="underline underline-offset-4"
                >
                  {row.campaignLabel}
                </Link>{" "}
                · {registrationStatus(row.status).label} ·{" "}
                {formatDateTime(row.createdAt)}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </AlertContent>
    </Alert>
  );
}

function PriorMemberships({
  memberships,
  userId,
}: {
  memberships: AdminRegistrationDetail["priorMemberships"];
  userId: string | null;
}) {
  if (memberships.length === 0) return null;

  return (
    <Section title="ha estat membre abans">
      <FieldList>
        {memberships.map((membership) => (
          <Field key={membership.campaignId} label={membership.campaignLabel}>
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={membershipStatus(membership.status)} />
              <span className="text-muted-foreground">
                des de {formatDateTime(membership.joinedAt)}
                {membership.endedAt
                  ? ` · fins a ${formatDateTime(membership.endedAt)}`
                  : ""}
              </span>
            </span>
          </Field>
        ))}
      </FieldList>
      {userId ? (
        <Link
          href={`/members/${userId}`}
          className="inline-block text-sm font-medium text-secondary underline-offset-4 hover:underline"
        >
          obre la fitxa de membre
        </Link>
      ) : null}
    </Section>
  );
}

export function RegistrationDetail({
  id,
  initialData,
}: {
  id: string;
  initialData: AdminRegistrationDetail;
}) {
  const { data } = useRegistration(id, initialData);
  const detail = data ?? initialData;
  const { registration, classification, existingUserId } = detail;
  const profile = registration.profileSnapshot;
  const name = fullName(profile);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={registrationStatus(registration.status)} />
        <Badge variant={classification === "new" ? "outline" : "secondary"}>
          {classification === "new" ? "cara nova" : "ja havia estat membre"}
        </Badge>
      </div>

      <DuplicateWarning duplicates={detail.duplicateRegistrations} />

      <Section title="dades de la sol·licitud">
        <FieldList>
          <Field label="nom">{name}</Field>
          <Field label="correu">{registration.email}</Field>
          <Field label="telèfon">{profile.phoneDisplay}</Field>
          <Field label="grau">{profile.degree}</Field>
          <Field label="curs">{profile.studyYear}</Field>
          {profile.note ? <Field label="nota">{profile.note}</Field> : null}
          <Field label="enviada">
            {formatDateTime(registration.createdAt)}
          </Field>
          <Field label="correu verificat">
            {registration.verifiedAt
              ? formatDateTime(registration.verifiedAt)
              : "encara no"}
          </Field>
          {registration.reviewedAt ? (
            <Field label="revisada">
              {formatDateTime(registration.reviewedAt)}
            </Field>
          ) : null}
          {registration.rejectionReason ? (
            <Field label="motiu del rebuig">
              {registration.rejectionReason}
            </Field>
          ) : null}
        </FieldList>
      </Section>

      <PriorMemberships
        memberships={detail.priorMemberships}
        userId={existingUserId}
      />

      <RegistrationActions registration={registration} name={name} />
    </div>
  );
}

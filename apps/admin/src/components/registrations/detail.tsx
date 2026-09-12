"use client";

import Link from "next/link";
import { Copy, TriangleAlert } from "lucide-react";

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertTitle,
} from "@repo/ui/alert";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/toast";
import { Tooltip, TooltipContent } from "@repo/ui/tooltip";

import {
  Field,
  FieldList,
  Panel,
  Section,
  Timeline,
  TimelineItem,
  type TimelineTone,
} from "@/components/admin/detail-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { RegistrationDecision } from "@/components/registrations/detail-actions";
import type {
  AdminRegistration,
  AdminRegistrationDetail,
} from "@/lib/admin-types";
import { fullName } from "@/lib/admin-types";
import { formatDateTime } from "@/lib/format";
import { membershipStatus, registrationStatus } from "@/lib/labels";
import { useRegistration } from "@/lib/registrations";

function CopyButton({ value, label }: { value: string; label: string }) {
  function copy() {
    if (!navigator.clipboard) {
      toast.error("aquest navegador no deixa copiar des de la pàgina");
      return;
    }
    void navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copiat`),
      () => toast.error("no s'ha pogut copiar"),
    );
  }

  return (
    <Tooltip>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label={`copia el ${label}`}
        onClick={copy}
      >
        <Copy className="size-3.5" aria-hidden />
      </Button>
      <TooltipContent>copia el {label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A way to reach the applicant, not a string to retype.
 *
 * This screen exists to decide whether to contact someone, so every address
 * and number opens the mail client or the dialer and can be copied in one
 * click — half of these are read on a phone.
 */
function ContactValue({
  href,
  value,
  label,
}: {
  href: string;
  value: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <a href={href} className="min-w-0 break-all underline underline-offset-4">
        {value}
      </a>
      <CopyButton value={value} label={label} />
    </span>
  );
}

function EmailField({
  label,
  address,
}: {
  label: string;
  address: string | null;
}) {
  return (
    <Field label={label}>
      {address ? (
        <ContactValue
          href={`mailto:${address}`}
          value={address}
          label="correu"
        />
      ) : (
        "no consta"
      )}
    </Field>
  );
}

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

interface Stop {
  label: string;
  at: string | null;
  tone: TimelineTone;
}

/**
 * The three moments a sol·licitud has, oldest first.
 *
 * It reads top-down rather than newest-first like the member fitxa because
 * this is a fixed three-step lifecycle, not an open-ended log: the point is
 * how far along the form has got, and the step still missing is the one that
 * carries the marker.
 */
function historyStops(registration: AdminRegistration): Stop[] {
  const verified = registration.verifiedAt !== null;
  const decided =
    registration.status === "accepted" || registration.status === "rejected";

  return [
    {
      label: "sol·licitud enviada",
      at: registration.createdAt,
      tone: "muted",
    },
    {
      label: verified ? "correu verificat" : "correu per verificar",
      at: registration.verifiedAt,
      tone: verified ? "muted" : "active",
    },
    {
      label: decided
        ? `sol·licitud ${registrationStatus(registration.status).label}`
        : "esperant revisió",
      at: registration.reviewedAt,
      tone: decided
        ? registration.status === "rejected"
          ? "danger"
          : "active"
        : verified
          ? "active"
          : "muted",
    },
  ];
}

function History({ registration }: { registration: AdminRegistration }) {
  const stops = historyStops(registration);

  return (
    <Section title="historial">
      <Panel className="p-4">
        <Timeline>
          {stops.map((stop, index) => (
            <TimelineItem
              key={stop.label}
              tone={stop.tone}
              last={index === stops.length - 1}
            >
              <p className="text-sm font-medium">{stop.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {stop.at ? formatDateTime(stop.at) : "encara no"}
              </p>
            </TimelineItem>
          ))}
        </Timeline>
      </Panel>
    </Section>
  );
}

function PriorMemberships({
  memberships,
}: {
  memberships: AdminRegistrationDetail["priorMemberships"];
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
  const isNew = classification === "new";

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={registrationStatus(registration.status)} />
        {/* The same two words the dashboard's team breakdown uses, so one idea
            is not called two things on two screens. */}
        <Badge
          variant={isNew ? "outline" : "secondary"}
          title={
            isNew
              ? "primera campanya amb nosaltres"
              : "ja havia estat membre abans"
          }
        >
          {isNew ? "nou" : "og"}
        </Badge>
      </div>

      <DuplicateWarning duplicates={detail.duplicateRegistrations} />

      <Section title="dades de la sol·licitud">
        <FieldList>
          <Field label="nom">{name}</Field>
          <EmailField
            label="correu universitari"
            address={registration.universityEmail}
          />
          <EmailField
            label="correu personal"
            address={registration.personalEmail}
          />
          <Field label="telèfon">
            <ContactValue
              href={`tel:${profile.phoneE164}`}
              value={profile.phoneDisplay}
              label="telèfon"
            />
          </Field>
          <Field label="grau">{profile.degree}</Field>
          <Field label="curs">{profile.studyYear}</Field>
          {profile.note ? <Field label="nota">{profile.note}</Field> : null}
        </FieldList>
      </Section>

      <History registration={registration} />

      <PriorMemberships memberships={detail.priorMemberships} />

      <RegistrationDecision
        registration={registration}
        name={name}
        existingUserId={existingUserId}
      />
    </div>
  );
}

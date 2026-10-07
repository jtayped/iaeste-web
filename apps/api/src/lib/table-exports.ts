import {
  CAMPAIGN_STATE_LABELS,
  invitationStatusLabel,
  MEMBER_TARGET_STATE_LABELS,
  membershipStatusLabel,
  NO_CURRENT_MEMBERSHIP_LABEL,
  REGISTRATION_STATUS_LABELS,
  roleLabel,
} from "@repo/constants/admin-labels";
import type { CampaignRepository, MemberListRow } from "@repo/db/repositories";

import type { AdminInvitationView } from "../services/invitation-service";
import type { AdminRegistrationView } from "../services/registration-service";
import { instant, type ExportColumn } from "./table-export";

/**
 * The columns of each admin list's CSV export.
 *
 * Every column the table can show is here, including the ones a phone hides,
 * plus the fields a spreadsheet is usually opened for that the table leaves
 * to the detail page: phone numbers, the second email address, review dates.
 * Names are written as they were typed — the admin cases them on display
 * only, and a file is data someone may paste somewhere else.
 */

export const MEMBER_EXPORT_COLUMNS: readonly ExportColumn<MemberListRow>[] = [
  { header: "nom", value: (row) => row.name },
  { header: "cognoms", value: (row) => row.surnames },
  { header: "correu", value: (row) => row.email },
  { header: "telèfon", value: (row) => row.phone },
  { header: "estudis", value: (row) => row.degree },
  { header: "any de carrera", value: (row) => row.studyYear },
  { header: "rol", value: (row) => roleLabel(row.role) },
  {
    header: "estat actual",
    value: (row) =>
      row.currentStatus
        ? membershipStatusLabel(row.currentStatus)
        : NO_CURRENT_MEMBERSHIP_LABEL,
  },
  { header: "campanyes", value: (row) => row.totalMemberships },
];

/**
 * Only with a target campaign, which is also the only time the table draws
 * the column: without one every row would carry the same empty state.
 */
export function memberExportColumns(
  hasTarget: boolean,
): readonly ExportColumn<MemberListRow>[] {
  if (!hasTarget) return MEMBER_EXPORT_COLUMNS;
  return [
    ...MEMBER_EXPORT_COLUMNS,
    {
      header: "destí",
      value: (row) =>
        row.targetState ? MEMBER_TARGET_STATE_LABELS[row.targetState] : null,
    },
  ];
}

export const REGISTRATION_EXPORT_COLUMNS: readonly ExportColumn<AdminRegistrationView>[] =
  [
    { header: "nom", value: (row) => row.profileSnapshot.name },
    { header: "cognoms", value: (row) => row.profileSnapshot.surnames },
    { header: "correu", value: (row) => row.email },
    { header: "correu universitari", value: (row) => row.universityEmail },
    { header: "correu personal", value: (row) => row.personalEmail },
    { header: "telèfon", value: (row) => row.profileSnapshot.phoneDisplay },
    { header: "estudis", value: (row) => row.profileSnapshot.degree },
    { header: "any de carrera", value: (row) => row.profileSnapshot.studyYear },
    { header: "estat", value: (row) => REGISTRATION_STATUS_LABELS[row.status] },
    { header: "nota", value: (row) => row.profileSnapshot.note },
    { header: "enviada", value: (row) => instant(row.createdAt) },
    { header: "verificada", value: (row) => instant(row.verifiedAt) },
    { header: "revisada", value: (row) => instant(row.reviewedAt) },
    { header: "motiu del rebuig", value: (row) => row.rejectionReason },
  ];

export const INVITATION_EXPORT_COLUMNS: readonly ExportColumn<AdminInvitationView>[] =
  [
    { header: "correu", value: (row) => row.email },
    { header: "nom", value: (row) => row.prefillName },
    { header: "cognoms", value: (row) => row.prefillSurnames },
    { header: "rol", value: (row) => roleLabel(row.intendedRole) },
    {
      header: "estat",
      value: (row) => invitationStatusLabel(row.status, row.expired),
    },
    { header: "enviat", value: (row) => instant(row.createdAt) },
    { header: "caduca", value: (row) => instant(row.expiresAt) },
    { header: "acceptat", value: (row) => instant(row.acceptedAt) },
  ];

type CampaignExportRow = Awaited<
  ReturnType<CampaignRepository["listWithCounts"]>
>["rows"][number];

export const CAMPAIGN_EXPORT_COLUMNS: readonly ExportColumn<CampaignExportRow>[] =
  [
    { header: "campanya", value: (row) => row.label },
    { header: "identificador", value: (row) => row.slug },
    { header: "estat", value: (row) => CAMPAIGN_STATE_LABELS[row.state] },
    { header: "actual", value: (row) => row.isCurrent },
    { header: "inscripcions obertes", value: (row) => row.isRegistrationOpen },
    { header: "membres actius", value: (row) => row.activeMembers },
    { header: "per revisar", value: (row) => row.pendingReview },
    { header: "inici", value: (row) => row.membershipStartsAt },
    { header: "final", value: (row) => row.membershipEndsAt },
    {
      header: "obertura d'inscripcions",
      value: (row) => row.registrationOpensAt,
    },
    {
      header: "tancament d'inscripcions",
      value: (row) => row.registrationClosesAt,
    },
  ];

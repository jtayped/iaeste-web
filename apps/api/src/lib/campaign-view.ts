import type { CampaignState } from "@repo/db/repositories";

/** JSON-ready admin view of a `membership_campaign` row — dates as ISO. */
export interface AdminCampaignView {
  id: string;
  slug: string;
  label: string;
  membershipStartsAt: string;
  membershipEndsAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  isCurrent: boolean;
  isRegistrationOpen: boolean;
  state: CampaignState;
  sheetTabName: string | null;
  sheetSyncedAt: string | null;
  sheetStale: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CampaignRow {
  id: string;
  slug: string;
  label: string;
  membershipStartsAt: Date;
  membershipEndsAt: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  isCurrent: boolean;
  isRegistrationOpen: boolean;
  state: CampaignState;
  sheetTabName: string | null;
  sheetSyncedAt: Date | null;
  sheetStale: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toCampaignView(row: CampaignRow): AdminCampaignView {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    membershipStartsAt: row.membershipStartsAt.toISOString(),
    membershipEndsAt: row.membershipEndsAt.toISOString(),
    registrationOpensAt: row.registrationOpensAt.toISOString(),
    registrationClosesAt: row.registrationClosesAt.toISOString(),
    isCurrent: row.isCurrent,
    isRegistrationOpen: row.isRegistrationOpen,
    state: row.state,
    sheetTabName: row.sheetTabName,
    sheetSyncedAt: row.sheetSyncedAt ? row.sheetSyncedAt.toISOString() : null,
    sheetStale: row.sheetStale,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

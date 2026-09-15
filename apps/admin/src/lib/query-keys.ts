import type {
  CampaignSortKey,
  InvitationSortKey,
  MemberSortKey,
  RegistrationSortKey,
  SortDirection,
} from "@repo/constants/validators/admin-list";

import type {
  BroadcastAudience,
  BroadcastContent,
  CampaignState,
  InvitationStatusFilter,
  MemberFilter,
  RegistrationStatus,
} from "@/lib/admin-types";

/**
 * One catalogue of TanStack Query keys.
 *
 * Mutations invalidate by prefix (`queryKeys.registrations.all`), so the keys
 * are built root-first and the parameters that narrow a list come last. A key
 * spelled inline at a call site is the usual reason an action appears to do
 * nothing until you reload.
 *
 * Every list key carries its `sort` and `dir`. A different ordering is a
 * different page of rows from the server, so a key that left them out would
 * hand the previous ordering back out of the cache and silently ignore the
 * click.
 */
export const queryKeys = {
  overview: ["overview"] as const,
  profile: ["profile"] as const,

  registrations: {
    all: ["registrations"] as const,
    list: (params: {
      campaignId: string;
      status: RegistrationStatus | "all";
      q: string;
      sort: RegistrationSortKey;
      dir: SortDirection;
      limit: number;
      offset: number;
    }) => ["registrations", "list", params] as const,
    detail: (id: string) => ["registrations", "detail", id] as const,
  },

  members: {
    all: ["members"] as const,
    list: (params: {
      q: string;
      filter: MemberFilter;
      campaignId?: string;
      targetCampaignId?: string;
      sort: MemberSortKey;
      dir: SortDirection;
      limit: number;
      offset: number;
    }) => ["members", "list", params] as const,
    detail: (userId: string) => ["members", "detail", userId] as const,
  },

  campaigns: {
    all: ["campaigns"] as const,
    list: (params: {
      q: string;
      state: CampaignState | "";
      sort: CampaignSortKey;
      dir: SortDirection;
      limit: number;
      offset: number;
    }) => ["campaigns", "list", params] as const,
  },

  invitations: {
    all: ["invitations"] as const,
    list: (params: {
      campaignId: string;
      status: InvitationStatusFilter;
      q: string;
      sort: InvitationSortKey;
      dir: SortDirection;
      limit: number;
      offset: number;
    }) => ["invitations", "list", params] as const,
  },

  /**
   * Both broadcast reads are POSTs — a selection can carry hundreds of row ids
   * and does not fit a query string — so the request body *is* the key. They
   * are reads all the same: neither endpoint sends anything.
   */
  broadcasts: {
    all: ["broadcasts"] as const,
    recipients: (audience: BroadcastAudience) =>
      ["broadcasts", "recipients", audience] as const,
    preview: (params: {
      content: BroadcastContent;
      audience?: BroadcastAudience;
    }) => ["broadcasts", "preview", params] as const,
  },
} as const;

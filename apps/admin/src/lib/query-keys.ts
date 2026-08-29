import type {
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
 */
export const queryKeys = {
  overview: ["overview"] as const,

  registrations: {
    all: ["registrations"] as const,
    list: (params: {
      campaignId: string;
      status: RegistrationStatus | "all";
      q: string;
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
      limit: number;
      offset: number;
    }) => ["invitations", "list", params] as const,
  },
} as const;

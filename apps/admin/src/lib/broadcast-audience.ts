import type {
  BroadcastAudience,
  InvitationStatusFilter,
  MemberFilter,
  RegistrationStatus,
} from "@/lib/admin-types";
import type { DataTableSelectionValue } from "@/components/data-table/types";

/**
 * A table selection, turned into the audience the broadcast routes speak.
 *
 * Pure and free of hooks on purpose: this is the one mapping that differs
 * between the three tables offering the composer, so it is the one part worth
 * testing on its own. Everything downstream takes the result and knows nothing
 * about which table it came from.
 */

type Selection = DataTableSelectionValue;

/**
 * `mode: "all"` means "everyone the current server-side query matches, minus
 * these". The table never holds that set, so the filters travel to the API
 * instead of a list of ids — the same rule the bulk-invite route follows.
 */
export function registrationsAudience(
  selection: Selection,
  query: { campaignId: string; status?: RegistrationStatus; q?: string },
): BroadcastAudience {
  return {
    kind: "registrations",
    selection:
      selection.mode === "ids"
        ? { mode: "ids", rowIds: [...selection.rowIds] }
        : {
            mode: "all",
            campaignId: query.campaignId,
            ...(query.status ? { status: query.status } : {}),
            ...(query.q ? { q: query.q } : {}),
            excludedRowIds: [...selection.excludedRowIds],
          },
  };
}

export function membersAudience(
  selection: Selection,
  query: { q?: string; filter?: MemberFilter; campaignId?: string },
): BroadcastAudience {
  return {
    kind: "members",
    selection:
      selection.mode === "ids"
        ? { mode: "ids", rowIds: [...selection.rowIds] }
        : {
            mode: "all",
            ...(query.q ? { q: query.q } : {}),
            ...(query.filter ? { filter: query.filter } : {}),
            ...(query.campaignId ? { campaignId: query.campaignId } : {}),
            excludedRowIds: [...selection.excludedRowIds],
          },
  };
}

/** The audience has no "all statuses" member, so the `all` tab sends none. */
export function invitationsAudience(
  selection: Selection,
  query: { campaignId: string; status: InvitationStatusFilter; q?: string },
): BroadcastAudience {
  return {
    kind: "invitations",
    selection:
      selection.mode === "ids"
        ? { mode: "ids", rowIds: [...selection.rowIds] }
        : {
            mode: "all",
            campaignId: query.campaignId,
            ...(query.status === "all" ? {} : { status: query.status }),
            ...(query.q ? { q: query.q } : {}),
            excludedRowIds: [...selection.excludedRowIds],
          },
  };
}

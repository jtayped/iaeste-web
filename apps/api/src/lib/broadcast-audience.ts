import type { BroadcastAudience } from "@repo/db/repositories";
import type { z } from "@hono/zod-openapi";

import type { broadcastAudienceSchema } from "../contracts";

type AudienceRequest = z.infer<typeof broadcastAudienceSchema>;

/**
 * Turns the wire shape into the repository's.
 *
 * The wire shape speaks in `rowIds` for every table, because the admin's
 * `<DataTable>` selection does and one shape across three tables is the whole
 * point of the composer being a standard table action. The repository speaks
 * in each table's own key, because that is what its queries filter on. This
 * function is the one place those two vocabularies meet.
 */
export function toBroadcastAudience(
  audience: AudienceRequest,
): BroadcastAudience {
  switch (audience.kind) {
    case "registrations":
      return {
        kind: "registrations",
        selection:
          audience.selection.mode === "ids"
            ? { mode: "ids", registrationIds: [...audience.selection.rowIds] }
            : {
                mode: "all",
                campaignId: audience.selection.campaignId,
                ...(audience.selection.status
                  ? { status: audience.selection.status }
                  : {}),
                ...(audience.selection.q ? { q: audience.selection.q } : {}),
                excludedRegistrationIds: [
                  ...audience.selection.excludedRowIds,
                ],
              },
      };

    case "members":
      return {
        kind: "members",
        selection:
          audience.selection.mode === "ids"
            ? { mode: "ids", userIds: [...audience.selection.rowIds] }
            : {
                mode: "all",
                ...(audience.selection.q ? { q: audience.selection.q } : {}),
                ...(audience.selection.filter
                  ? { filter: audience.selection.filter }
                  : {}),
                ...(audience.selection.campaignId
                  ? { campaignId: audience.selection.campaignId }
                  : {}),
                excludedUserIds: [...audience.selection.excludedRowIds],
              },
      };

    case "invitations":
      return {
        kind: "invitations",
        selection:
          audience.selection.mode === "ids"
            ? { mode: "ids", invitationIds: [...audience.selection.rowIds] }
            : {
                mode: "all",
                campaignId: audience.selection.campaignId,
                ...(audience.selection.status
                  ? { status: audience.selection.status }
                  : {}),
                ...(audience.selection.q ? { q: audience.selection.q } : {}),
                excludedInvitationIds: [...audience.selection.excludedRowIds],
              },
      };
  }
}

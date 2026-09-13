"use client";

import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import type {
  BroadcastAudience,
  BroadcastContent,
  BroadcastPreview,
  BroadcastRecipients,
  BroadcastSendResponse,
  BroadcastTestResponse,
} from "@/lib/admin-types";
import { apiClient } from "@/lib/api";
import { ApiRequestError, unwrap } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

/**
 * The composer's data layer.
 *
 * Every table that can select people offers the same broadcast action, so the
 * only thing that varies between the three call sites is the `audience` it
 * builds — see `./broadcast-audience`, re-exported here so a call site has one
 * import. Everything below takes that value and knows nothing about which
 * table it came from.
 */
export {
  invitationsAudience,
  membersAudience,
  registrationsAudience,
} from "@/lib/broadcast-audience";

/**
 * Who the selection actually reaches, resolved by the API.
 *
 * This is the number the operator confirms and the number the send is pinned
 * to, so it is deliberately not derived from the table's own row count: a
 * "select all" spans pages the browser has never seen, and two people can
 * share one address.
 */
export function useBroadcastRecipients(
  audience: BroadcastAudience,
  enabled: boolean,
): UseQueryResult<BroadcastRecipients, Error> {
  return useQuery({
    queryKey: queryKeys.broadcasts.recipients(audience),
    enabled,
    // A selection that has just changed should not be answered with the old
    // count for even one frame — that number is what the send is pinned to.
    staleTime: 0,
    retry: false,
    queryFn: async (): Promise<BroadcastRecipients> =>
      unwrap(
        await apiClient.POST("/v1/admin/broadcasts/recipients", {
          body: { audience },
        }),
      ),
  });
}

/**
 * The email itself, rendered server-side from the same React Email component
 * the send uses. `html` is the exact bytes that will be delivered, which is
 * why the composer shows it in a sandboxed iframe rather than re-implementing
 * the template in the admin.
 */
export function useBroadcastPreview(
  content: BroadcastContent,
  audience: BroadcastAudience | undefined,
  enabled: boolean,
): UseQueryResult<BroadcastPreview, Error> {
  const params = { content, ...(audience ? { audience } : {}) };

  return useQuery({
    queryKey: queryKeys.broadcasts.preview(params),
    enabled,
    retry: false,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<BroadcastPreview> =>
      unwrap(
        await apiClient.POST("/v1/admin/broadcasts/preview", { body: params }),
      ),
  });
}

/**
 * Sends one copy to the signed-in admin. The address comes from the session
 * on the API side and can never be chosen here — this is the safety net before
 * mailing a room, not a way to mail anyone.
 */
export function useBroadcastTest(): UseMutationResult<
  BroadcastTestResponse,
  Error,
  BroadcastContent
> {
  return useMutation({
    mutationFn: async (content) =>
      unwrap(
        await apiClient.POST("/v1/admin/broadcasts/test", {
          body: { content },
        }),
      ),
  });
}

export interface SendBroadcastInput {
  audience: BroadcastAudience;
  content: BroadcastContent;
  /** The `total` the recipients call returned and the operator confirmed. */
  expectedRecipients: number;
}

export function useSendBroadcast(): UseMutationResult<
  BroadcastSendResponse,
  Error,
  SendBroadcastInput
> {
  return useMutation({
    mutationFn: async (input) =>
      unwrap(await apiClient.POST("/v1/admin/broadcasts", { body: input })),
  });
}

/**
 * The selection moved between the count the operator confirmed and the send.
 * Its own code rather than a phrase inside the 409's message: the two 409s
 * this route can raise want different things from the operator — re-check a
 * changed selection, or narrow a too-wide one — so the API names them apart.
 */
export function isAudienceChangedError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError && error.code === "AUDIENCE_CHANGED"
  );
}

/** The 409 raised because the selection reaches more people than allowed. */
export function isTooManyRecipientsError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status === 409 &&
    error.code === "CONFLICT"
  );
}

/** The provider refused the test send; nothing reached anybody else. */
export function isProviderRefusedError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 502;
}

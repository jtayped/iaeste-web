"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { toast } from "@repo/ui/toast";

import type {
  AdminMemberDetail,
  AdminMemberEmails,
  AdminMemberList,
  AdminSetMemberEmailsRequest,
  MemberFilter,
  MemberRole,
} from "@/lib/admin-types";
import { apiClient, NO_BODY_POST } from "@/lib/api";
import { errorDetail, errorMessage, unwrap } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

export const MEMBERS_PAGE_SIZE = 20;

export interface MembersQuery {
  q: string;
  filter: MemberFilter;
  campaignId?: string;
  targetCampaignId?: string;
  limit: number;
  offset: number;
}

export function useMembers(params: MembersQuery) {
  return useQuery({
    queryKey: queryKeys.members.list(params),
    // The previous page stays on screen while the next one loads, so paging
    // does not blank the list and bounce the scroll position.
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<AdminMemberList> =>
      unwrap(
        await apiClient.GET("/v1/admin/members", {
          params: {
            query: {
              ...(params.q ? { q: params.q } : {}),
              filter: params.filter,
              ...(params.campaignId ? { campaignId: params.campaignId } : {}),
              ...(params.targetCampaignId
                ? { targetCampaignId: params.targetCampaignId }
                : {}),
              limit: params.limit,
              offset: params.offset,
            },
          },
        }),
      ),
  });
}

export function useMember(userId: string, initialData?: AdminMemberDetail) {
  return useQuery({
    queryKey: queryKeys.members.detail(userId),
    ...(initialData ? { initialData } : {}),
    queryFn: async (): Promise<AdminMemberDetail> =>
      unwrap(
        await apiClient.GET("/v1/admin/members/{userId}", {
          params: { path: { userId } },
        }),
      ),
  });
}

export type MemberAction =
  | { kind: "leave"; userId: string; reason?: string }
  | { kind: "kick"; userId: string; reason: string }
  | { kind: "restore"; userId: string }
  | { kind: "role"; userId: string; role: MemberRole };

const SUCCESS_COPY: Record<MemberAction["kind"], string> = {
  leave: "baixa registrada",
  kick: "membre expulsat i sessions tancades",
  restore: "membre readmès",
  role: "rol actualitzat",
};

async function runMemberAction(action: MemberAction): Promise<void> {
  const path = { userId: action.userId };

  switch (action.kind) {
    case "leave":
      unwrap(
        await apiClient.POST("/v1/admin/members/{userId}/leave", {
          params: { path },
          body: action.reason ? { reason: action.reason } : {},
        }),
      );
      return;
    case "kick":
      unwrap(
        await apiClient.POST("/v1/admin/members/{userId}/kick", {
          params: { path },
          body: { reason: action.reason },
        }),
      );
      return;
    case "restore":
      unwrap(
        await apiClient.POST("/v1/admin/members/{userId}/restore", {
          params: { path },
          ...NO_BODY_POST,
        }),
      );
      return;
    case "role":
      unwrap(
        await apiClient.PATCH("/v1/admin/members/{userId}/role", {
          params: { path },
          body: { role: action.role },
        }),
      );
  }
}

/**
 * Leave / kick / restore / set-role.
 *
 * All four change what the members list shows and three of them change the
 * overview counts, so the invalidation is the same for each — see
 * `useReviewAction` for the same reasoning.
 */
export function useMemberAction(): UseMutationResult<
  void,
  Error,
  MemberAction
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runMemberAction,
    onSuccess: (_data, action) => {
      toast.success(SUCCESS_COPY[action.kind]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
    onError: (error) => {
      const detail = errorDetail(error);
      toast.error(errorMessage(error), {
        ...(detail ? { description: detail } : {}),
      });
    },
  });
}

export interface SetMemberEmailsInput extends Required<AdminSetMemberEmailsRequest> {
  userId: string;
}

/**
 * Set both halves of a member's dual-email pair in one PATCH.
 *
 * Both keys always travel, because the endpoint reads an omitted key as "leave
 * this slot alone" — the only way to *clear* a slot is to send an explicit
 * `null`, and a form with two inputs cannot tell "unchanged" from "emptied"
 * unless it states both. Re-sending an address unchanged is idempotent.
 *
 * An admin edit is trusted: the API returns both saved addresses already
 * verified, so there is no confirmation mail to chase afterwards.
 *
 * `queryKeys.members.all` is the prefix of `members.detail(userId)`, so the one
 * invalidation redraws both the fitxa and the list the member is listed in.
 */
export function useSetMemberEmails(): UseMutationResult<
  AdminMemberEmails,
  Error,
  SetMemberEmailsInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      university,
      personal,
    }: SetMemberEmailsInput): Promise<AdminMemberEmails> => {
      const { emails } = unwrap(
        await apiClient.PATCH("/v1/admin/members/{userId}/emails", {
          params: { path: { userId } },
          body: { university, personal },
        }),
      );
      return emails;
    },
    onSuccess: (_emails, { userId }) => {
      toast.success("correus actualitzats");
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members.detail(userId),
      });
    },
    onError: (error) => {
      const detail = errorDetail(error);
      toast.error(errorMessage(error), {
        ...(detail ? { description: detail } : {}),
      });
    },
  });
}

/**
 * Permanent, irreversible erasure of a user and every row about them.
 *
 * Kept apart from `useMemberAction` on purpose: leave / kick / restore are
 * reversible status changes on a membership, this destroys the account and
 * the whole history. It is never offered next to those in the same control —
 * see `member-actions.tsx`. The member fitxa the caller is on stops existing
 * the moment this succeeds, so the caller navigates away in `onSuccess`
 * rather than this hook re-fetching a now-404 detail.
 */
export function useDeleteMember(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      unwrap(
        await apiClient.DELETE("/v1/admin/members/{userId}", {
          params: { path: { userId } },
        }),
      );
    },
    onSuccess: () => {
      toast.success("usuari eliminat definitivament");
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
    onError: (error) => {
      const detail = errorDetail(error);
      toast.error(errorMessage(error), {
        ...(detail ? { description: detail } : {}),
      });
    },
  });
}

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { toast } from "@repo/ui/sonner";

import type {
  AdminRegistration,
  AdminRegistrationDetail,
  RegistrationStatus,
} from "@/lib/admin-types";
import { apiClient, NO_BODY_POST } from "@/lib/api";
import { errorDetail, errorMessage, unwrap } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

/**
 * The review queue's data layer.
 *
 * `campaignId` is a *required* query parameter on `GET /v1/admin/registrations`
 * — there is no "every campaign" listing — so every hook here takes one and
 * the calling page is responsible for having resolved it first.
 */
export function useRegistrations(
  campaignId: string,
  status: RegistrationStatus | "all",
) {
  return useQuery({
    queryKey: queryKeys.registrations.list(campaignId, status),
    enabled: campaignId.length > 0,
    queryFn: async (): Promise<AdminRegistration[]> =>
      unwrap(
        await apiClient.GET("/v1/admin/registrations", {
          params: {
            query: {
              campaignId,
              ...(status === "all" ? {} : { status }),
            },
          },
        }),
      ),
  });
}

export function useRegistration(
  id: string,
  initialData?: AdminRegistrationDetail,
) {
  return useQuery({
    queryKey: queryKeys.registrations.detail(id),
    ...(initialData ? { initialData } : {}),
    queryFn: async (): Promise<AdminRegistrationDetail> =>
      unwrap(
        await apiClient.GET("/v1/admin/registrations/{id}", {
          params: { path: { id } },
        }),
      ),
  });
}

/** What the three review actions have in common: an id and, sometimes, a reason. */
export type ReviewAction =
  | { kind: "accept"; id: string }
  | { kind: "reject"; id: string; reason: string }
  | { kind: "restore"; id: string };

const SUCCESS_COPY: Record<ReviewAction["kind"], string> = {
  accept: "sol·licitud acceptada",
  reject: "sol·licitud rebutjada",
  restore: "sol·licitud tornada a la cua",
};

async function runReviewAction(action: ReviewAction): Promise<void> {
  if (action.kind === "accept") {
    unwrap(
      await apiClient.POST("/v1/admin/registrations/{id}/accept", {
        params: { path: { id: action.id } },
        body: {},
      }),
    );
    return;
  }

  if (action.kind === "reject") {
    unwrap(
      await apiClient.POST("/v1/admin/registrations/{id}/reject", {
        params: { path: { id: action.id } },
        body: { reason: action.reason },
      }),
    );
    return;
  }

  unwrap(
    await apiClient.POST("/v1/admin/registrations/{id}/restore", {
      params: { path: { id: action.id } },
      ...NO_BODY_POST,
    }),
  );
}

/**
 * One mutation for accept / reject / restore.
 *
 * They all invalidate the same two things — every registration list (the row
 * moves between tabs) and the overview counts the sidebar badge reads — so
 * splitting them into three hooks would only triplicate that.
 */
export function useReviewAction(): UseMutationResult<
  void,
  Error,
  ReviewAction
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runReviewAction,
    onSuccess: (_data, action) => {
      toast.success(SUCCESS_COPY[action.kind]);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.registrations.all,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    },
    onError: (error) => {
      const detail = errorDetail(error);
      toast.error(errorMessage(error), {
        ...(detail ? { description: detail } : {}),
      });
    },
  });
}

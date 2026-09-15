"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type {
  RegistrationSortKey,
  SortDirection,
} from "@repo/constants/validators/admin-list";
import { toast } from "@repo/ui/toast";

import type {
  AdminBulkAcceptRegistrationsResponse,
  AdminRegistrationDetail,
  AdminRegistrationList,
  RegistrationStatus,
} from "@/lib/admin-types";
import type { DataTableSelectionValue } from "@/components/data-table/types";
import { apiClient, NO_BODY_POST } from "@/lib/api";
import { errorDetail, errorMessage, unwrap } from "@/lib/api-error";
import {
  bulkAcceptDetail,
  bulkAcceptSelection,
  bulkAcceptSummary,
} from "@/lib/bulk-accept";
import { queryKeys } from "@/lib/query-keys";

export const REGISTRATIONS_PAGE_SIZE = 50;

export interface RegistrationsQuery {
  campaignId: string;
  status: RegistrationStatus | "all";
  q: string;
  /** Resolved in SQL by the route; never re-ordered on the client. */
  sort: RegistrationSortKey;
  dir: SortDirection;
  limit: number;
  offset: number;
}

/**
 * The review queue's data layer.
 *
 * `campaignId` is a *required* query parameter on `GET /v1/admin/registrations`
 * — there is no "every campaign" listing — so every hook here takes one and
 * the calling page is responsible for having resolved it first.
 */
export function useRegistrations(params: RegistrationsQuery) {
  return useQuery({
    queryKey: queryKeys.registrations.list(params),
    enabled: params.campaignId.length > 0,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<AdminRegistrationList> =>
      unwrap(
        await apiClient.GET("/v1/admin/registrations", {
          params: {
            query: {
              campaignId: params.campaignId,
              ...(params.status === "all" ? {} : { status: params.status }),
              ...(params.q ? { q: params.q } : {}),
              sort: params.sort,
              dir: params.dir,
              limit: params.limit,
              offset: params.offset,
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

export interface BulkAcceptInput {
  campaignId: string;
  /** The search behind a "select all", so the API resolves the same set. */
  q: string;
  selection: DataTableSelectionValue;
}

/**
 * Accepting a whole room at once — the AGO case.
 *
 * The selection rename and the result sentence live in `./bulk-accept`, which
 * has no hooks and is unit-tested; what is left here is the request and the
 * invalidations it shares with the single-row review actions.
 */
export function useBulkAcceptRegistrations(): UseMutationResult<
  AdminBulkAcceptRegistrationsResponse,
  Error,
  BulkAcceptInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, q, selection }) =>
      unwrap(
        await apiClient.POST("/v1/admin/registrations/bulk-accept", {
          body: { campaignId, selection: bulkAcceptSelection(selection, q) },
        }),
      ),
    onSuccess: (result) => {
      const detail = bulkAcceptDetail(result);
      const options = detail ? { description: detail } : undefined;

      // A partial failure is never a green toast: somebody has to chase the
      // addresses named in the description.
      if (result.failed.length > 0 || result.notificationsFailed.length > 0) {
        toast.warning(bulkAcceptSummary(result), options);
      } else {
        toast.success(bulkAcceptSummary(result), options);
      }

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

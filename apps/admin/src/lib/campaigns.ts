"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { toast } from "@repo/ui/toast";

import type {
  AdminCampaignList,
  AdminCampaignWithCounts,
  CampaignState,
} from "@/lib/admin-types";
import { apiClient, NO_BODY_POST } from "@/lib/api";
import { errorDetail, errorMessage, unwrap } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

export const CAMPAIGNS_PAGE_SIZE = 100;

export interface CampaignsQuery {
  q: string;
  state: CampaignState | "";
  limit: number;
  offset: number;
}

/** The four ISO instants every campaign carries. */
export interface CampaignDates {
  membershipStartsAt: string;
  membershipEndsAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
}

export function useCampaigns(
  params: CampaignsQuery,
  initialData?: AdminCampaignWithCounts[],
) {
  return useQuery({
    queryKey: queryKeys.campaigns.list(params),
    ...(initialData
      ? {
          initialData: {
            rows: initialData,
            total: initialData.length,
            limit: CAMPAIGNS_PAGE_SIZE,
            offset: 0,
          },
        }
      : {}),
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<AdminCampaignList> =>
      unwrap(
        await apiClient.GET("/v1/admin/campaigns", {
          params: {
            query: {
              ...(params.q ? { q: params.q } : {}),
              ...(params.state ? { state: params.state } : {}),
              limit: params.limit,
              offset: params.offset,
            },
          },
        }),
      ),
  });
}

export type CampaignAction =
  | { kind: "create"; slug: string; label: string; dates: CampaignDates }
  | {
      kind: "update";
      id: string;
      patch: Partial<CampaignDates> & { slug?: string; label?: string };
    }
  | { kind: "registration"; id: string; open: boolean }
  | { kind: "current"; id: string }
  | { kind: "archive"; id: string };

function successCopy(action: CampaignAction): string {
  switch (action.kind) {
    case "create":
      return "campanya creada";
    case "update":
      return "campanya desada";
    case "registration":
      return action.open ? "inscripcions obertes" : "inscripcions tancades";
    case "current":
      return "campanya marcada com a actual";
    case "archive":
      return "campanya arxivada";
  }
}

async function runCampaignAction(action: CampaignAction): Promise<void> {
  switch (action.kind) {
    case "create":
      unwrap(
        await apiClient.POST("/v1/admin/campaigns", {
          body: {
            slug: action.slug,
            label: action.label,
            ...action.dates,
          },
        }),
      );
      return;
    case "update":
      unwrap(
        await apiClient.PATCH("/v1/admin/campaigns/{id}", {
          params: { path: { id: action.id } },
          body: action.patch,
        }),
      );
      return;
    case "registration":
      unwrap(
        await apiClient.POST("/v1/admin/campaigns/{id}/registration", {
          params: { path: { id: action.id } },
          body: { open: action.open },
        }),
      );
      return;
    case "current":
      unwrap(
        await apiClient.POST("/v1/admin/campaigns/{id}/current", {
          params: { path: { id: action.id } },
          ...NO_BODY_POST,
        }),
      );
      return;
    case "archive":
      unwrap(
        await apiClient.POST("/v1/admin/campaigns/{id}/archive", {
          params: { path: { id: action.id } },
          ...NO_BODY_POST,
        }),
      );
  }
}

/**
 * Every campaign write.
 *
 * Note that create is `POST /v1/admin/campaigns` and edit is
 * `PATCH /v1/admin/campaigns/{id}` — the conventional pairing, despite what
 * the task brief said. There is no `GET` for a single campaign, so the detail
 * page reads the list and finds its row; invalidating the list is therefore
 * what refreshes the detail page too.
 */
export function useCampaignAction(): UseMutationResult<
  void,
  Error,
  CampaignAction
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runCampaignAction,
    onSuccess: (_data, action) => {
      toast.success(successCopy(action));
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
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

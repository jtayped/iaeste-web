"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@repo/ui/toast";

import type {
  AdminOwnProfile,
  AdminUpdateOwnProfileRequest,
} from "@/lib/admin-types";
import { apiClient } from "@/lib/api";
import { errorDetail, errorMessage, unwrap } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

export function useOwnProfile(initialData: AdminOwnProfile) {
  return useQuery({
    queryKey: queryKeys.profile,
    initialData,
    queryFn: async (): Promise<AdminOwnProfile> =>
      unwrap(await apiClient.GET("/v1/admin/profile")),
  });
}

export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: AdminUpdateOwnProfileRequest,
    ): Promise<AdminOwnProfile> =>
      unwrap(
        await apiClient.PATCH("/v1/admin/profile", {
          body,
        }),
      ),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      toast.success("perfil actualitzat");
    },
    onError: (error) => {
      const detail = errorDetail(error);
      toast.error(errorMessage(error), {
        ...(detail ? { description: detail } : {}),
      });
    },
  });
}
